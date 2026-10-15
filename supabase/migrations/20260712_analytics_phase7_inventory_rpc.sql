-- ============================================================
-- Analytics (BI) — Phase 7: analytics_inventory()
--
-- Lanjutan dari Phase 1-6. Scope migration ini HANYA 1 fungsi baru:
-- analytics_inventory() untuk tab baru "Inventory" — Stock Health, Dead
-- Stock, Aging Stock, Overstock, Understock, Inventory Value, Inventory
-- Turnover, Days of Inventory, Suggested Restock, Restock Priority, Stock
-- Risk Indicator. Dibangun di atas `sales_flat()` (Phase 1) dan
-- `stok_warna` (data existing) — TIDAK ada logika unnest jsonb yang
-- ditulis ulang, TIDAK ada tabel/kolom baru.
--
-- SENGAJA TIDAK DIDUPLIKASI dari Phase 2 (`analytics_products`): Slow/Fast
-- Moving SUDAH ada sebagai leaderboard per-produk di tab Products
-- (`movement.fastMoving`/`slowMoving`) — TIDAK dibuat ulang di sini.
-- "Stock Coverage" dari roadmap dipenuhi lewat `stockHealth` (distribusi
-- SKU per kategori cover days) + `overstock`/`understock` (leaderboard),
-- BUKAN section terpisah — supaya tidak ada 2 representasi berbeda untuk
-- konsep yang sama.
--
-- ════════════════════════════════════════════════════════════
-- ⚠️ KETERBATASAN DATA PENTING — WAJIB DIBACA SEBELUM PAKAI RPC INI
-- ════════════════════════════════════════════════════════════
--
-- 1. TIDAK ADA "reorder target"/par-level di skema ini. Tabel
--    `expected_stok` TERLIHAT relevan tapi TERNYATA punya arti bisnis yang
--    SAMA SEKALI BEDA: itu adalah baseline rekonsiliasi "Buku Potongan"
--    (jumlah kain yang SUDAH DIPOTONG produksi per kode×size×warna, dari
--    `produksi-record`), dipakai untuk mendeteksi selisih produksi↔stok,
--    BUKAN target restock. Nilainya TIDAK pernah bereaksi terhadap
--    penjualan/transfer dan bisa basi kalau tidak pernah dibuka
--    (`BukuPotonganPage.jsx`). Memakainya untuk Suggested Restock/Overstock
--    akan MENGARANG hubungan yang tidak ada. **Solusi realistis yang
--    dipakai di sini**: Suggested Restock/Overstock/Understock/Restock
--    Priority SELURUHNYA dihitung dari kecepatan jual aktual (`sales_flat`)
--    dan stok saat ini (`stok_warna`) — BUKAN dari `expected_stok`.
--
-- 2. Inventory Turnover & Days of Inventory: skema ini TIDAK menyimpan
--    snapshot stok historis (hanya stok SAAT INI di `stok_warna`), jadi
--    metode "average inventory" (rata-rata stok awal+akhir periode) yang
--    umum dipakai untuk Inventory Turnover TIDAK BISA dihitung secara
--    presisi. **Solusi realistis**: `daysOfInventory` dihitung dari stok
--    SAAT INI ÷ rata-rata COGS harian periode filter (ini valid & akurat —
--    tidak butuh snapshot historis). `inventoryTurnover` DITURUNKAN dari
--    `daysOfInventory` (periode_hari / daysOfInventory), BUKAN dihitung
--    independen via average-inventory — supaya kedua angka konsisten satu
--    sama lain, dan labelnya jujur soal metode yang dipakai (lihat field
--    `method` di summary).
--
-- 3. `products.hpp` adalah HPP TERKINI per kode (1 angka, bukan per
--    ukuran/batch) — dipakai untuk `totalInventoryValue` (stok SAAT INI
--    dinilai dengan HPP SAAT INI). Ini BEDA dari `sales_flat.hpp` (snapshot
--    HPP SAAT TRANSAKSI, dipakai untuk COGS historis di `avgDailyCogs`) —
--    keduanya SENGAJA beda sumber untuk tujuan beda (nilai stok sekarang
--    vs biaya penjualan historis), bukan inkonsistensi.
--
-- 4. Ambang "dead"/"critical"/"overstock" (hari) adalah HEURISTIK bisnis
--    yang bisa disesuaikan (dikirim sebagai parameter, bukan hardcode) —
--    BUKAN definisi baku universal. Default masuk akal untuk bisnis fashion
--    (gamis/mukena) dengan siklus penjualan pasar mingguan, tapi Denny
--    boleh minta angka lain kapan saja tanpa migration baru.
--
-- ════════════════════════════════════════════════════════════
-- analytics_inventory(p_from, p_to, p_location, p_kode, p_low_stock_cover_days,
--                      p_critical_cover_days, p_overstock_cover_days,
--                      p_dead_stock_days, p_restock_target_days)
-- ════════════════════════════════════════════════════════════
--
-- Return jsonb:
--   {
--     summary: {
--       totalInventoryValue, totalSkuWithStock, avgDailyCogs,
--       daysOfInventory, inventoryTurnover, method
--     },
--     stockHealth: { dead, critical, low, healthy, overstock, noMovementPeriod },
--     deadStock:      [{kode, value: daysSinceLastSale}, ...],     -- top 20
--     agingStock:     [{kode, value: daysSinceLastSale}, ...],     -- top 10
--     overstock:      [{kode, value: coverDays}, ...],             -- top 10
--     understock:     [{kode, value: coverDays}, ...],             -- top 10
--     suggestedRestock: [{kode, value: suggestedQty}, ...],        -- top 10
--     restockPriority:  [{kode, value: priorityScore}, ...],       -- top 10
--     stockRiskIndicator: [{kode, value: coverDaysOrDays, category}, ...]  -- top 15
--   }
--
-- Business rule per section:
--
-- summary.totalInventoryValue — SUM(stok × products.hpp SAAT INI), stok
--   dijumlah sesuai p_location (pola sama `stok_agg` di analytics_products
--   Phase 2). p_kode mempersempit ke 1 produk.
--
-- summary.avgDailyCogs — SUM(qty × hpp snapshot transaksi) dari
--   `sales_flat(p_from,p_to)` type='sale' (retur DIKECUALIKAN dari COGS —
--   retur bukan penjualan aktual), dibagi jumlah hari periode.
--
-- summary.daysOfInventory — totalInventoryValue ÷ avgDailyCogs. 0 kalau
--   avgDailyCogs = 0 (tidak ada penjualan di periode — bukan infinity/error).
--
-- summary.inventoryTurnover — DITURUNKAN: jumlah_hari_periode ÷
--   daysOfInventory (berapa kali "isi stok senilai ini" berputar dalam
--   periode filter). 0 kalau daysOfInventory = 0.
--
-- deadStock — kode dengan stok > 0 (sesuai p_location) DAN (belum PERNAH
--   terjual ALL-TIME ATAU hari sejak penjualan TERAKHIR ALL-TIME >
--   p_dead_stock_days). "Pernah terjual"/"terakhir terjual" dicek ALL-TIME
--   (pola sama `tidakPernahTerjual`/`customerBaru` — pakai sales_flat
--   rentang sangat lebar), TIDAK dibatasi p_from/p_to, karena "mati" adalah
--   sifat produk itu sendiri, bukan sifat periode filter. value = hari
--   sejak terakhir terjual (angka besar/tak terhingga secara praktis kalau
--   belum pernah terjual — dikirim sebagai NULL, FE menampilkan "Belum
--   pernah terjual").
--
-- agingStock — SEMUA kode dengan stok > 0 yang PERNAH terjual (punya
--   tanggal terakhir terjual), diurutkan hari-sejak-terakhir-terjual DESC.
--   Termasuk yang sudah masuk kategori "dead" (memang seharusnya muncul di
--   puncak daftar ini) — BEDA framing dari `deadStock` (yang HANYA kode di
--   atas ambang), `agingStock` adalah daftar lengkap untuk konteks, bukan
--   duplikasi logika (angka yang sama, cara pakai beda).
--
-- overstock/understock — HANYA kode dengan stok > 0 DAN qty_per_day
--   PERIODE > 0 (punya kecepatan jual terukur — kode tanpa penjualan sama
--   sekali di periode ini masuk kategori lain, `noMovementPeriod` di
--   `stockHealth`, BUKAN overstock/understock, konsisten prinsip Phase 2
--   soal qty=0 tidak dihitung cover days). coverDays = stok ÷ qty_per_day.
--   overstock: coverDays > p_overstock_cover_days. understock: coverDays <
--   p_low_stock_cover_days (mencakup juga yang "critical").
--
-- suggestedRestock — HANYA kode dengan qty_per_day PERIODE > 0 (butuh
--   histori penjualan utk estimasi permintaan — TIDAK mengarang demand utk
--   produk tanpa histori). suggestedQty = GREATEST(0, ROUND(qty_per_day ×
--   p_restock_target_days − stok_saat_ini)). HANYA kode dengan hasil > 0
--   (tidak ada saran restock kalau stok sudah cukup/lebih).
--
-- restockPriority — subset `suggestedRestock` (suggestedQty > 0), diurut
--   DESC oleh skor = total_revenue_periode ÷ GREATEST(coverDays, 0.1) —
--   produk kontribusi revenue besar DENGAN stok menipis diprioritaskan
--   lebih tinggi daripada produk kontribusi kecil dengan stok sama-sama
--   menipis. Formula sederhana & bisa dijelaskan (bukan black-box).
--
-- stockRiskIndicator — gabungan kode berkategori 'dead' atau 'critical'
--   (cover days < p_critical_cover_days), diurut severity (dead dulu, lalu
--   critical diurut coverDays ASC), field `category` disertakan agar FE
--   bisa memberi label/warna tanpa menghitung ulang.
--
-- Idempotent, SECURITY INVOKER, dibangun di atas sales_flat() + stok_warna
-- (existing) — tidak menulis ulang logika unnest jsonb atau RPC lain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_inventory(
  p_from                  date,
  p_to                    date,
  p_location              text,
  p_kode                  text,
  p_low_stock_cover_days  integer DEFAULT 7,
  p_critical_cover_days   integer DEFAULT 3,
  p_overstock_cover_days  integer DEFAULT 60,
  p_dead_stock_days       integer DEFAULT 30,
  p_restock_target_days   integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT sf.*
    FROM sales_flat(p_from, p_to) sf
    WHERE (p_location IS NULL OR sf.location = p_location)
      AND (p_kode IS NULL OR sf.kode = p_kode)
      AND sf.kode IS NOT NULL
  ),
  days_period AS (
    SELECT GREATEST(1, (p_to - p_from + 1))::numeric AS n
  ),
  movement_base AS (
    SELECT kode,
      SUM(qty) AS total_qty_period,
      SUM(revenue) AS total_revenue_period,
      (SUM(qty) / (SELECT n FROM days_period)) AS qty_per_day
    FROM filtered
    GROUP BY kode
    HAVING SUM(qty) > 0
  ),
  stok_agg AS (
    SELECT
      kode,
      CASE
        WHEN p_location IS NULL        THEN SUM(gudang + cideng + tegalgubug)
        WHEN p_location = 'gudang'     THEN SUM(gudang)
        WHEN p_location = 'cideng'     THEN SUM(cideng)
        WHEN p_location = 'tegalgubug' THEN SUM(tegalgubug)
        ELSE 0
      END AS total_stok
    FROM stok_warna
    WHERE (p_kode IS NULL OR kode = p_kode)
    GROUP BY kode
    HAVING (
      CASE
        WHEN p_location IS NULL        THEN SUM(gudang + cideng + tegalgubug)
        WHEN p_location = 'gudang'     THEN SUM(gudang)
        WHEN p_location = 'cideng'     THEN SUM(cideng)
        WHEN p_location = 'tegalgubug' THEN SUM(tegalgubug)
        ELSE 0
      END
    ) > 0
  ),
  last_sale AS (
    -- ALL-TIME, rentang sangat lebar (pola sama tidakPernahTerjual/
    -- customerBaru) — "kapan terakhir kode ini terjual (type=sale)",
    -- respecting p_location/p_kode.
    SELECT kode, MAX(tanggal) AS last_sale_date
    FROM sales_flat('1900-01-01'::date, '9999-12-31'::date) sf2
    WHERE sf2.type = 'sale'
      AND (p_location IS NULL OR sf2.location = p_location)
      AND (p_kode IS NULL OR sf2.kode = p_kode)
    GROUP BY kode
  ),
  stock_with_age AS (
    SELECT
      sa.kode,
      sa.total_stok,
      ls.last_sale_date,
      CASE WHEN ls.last_sale_date IS NULL THEN NULL
        ELSE (CURRENT_DATE - ls.last_sale_date) END AS days_since_last_sale
    FROM stok_agg sa
    LEFT JOIN last_sale ls ON ls.kode = sa.kode
  ),
  cover_base AS (
    SELECT
      swa.kode,
      swa.total_stok,
      mb.qty_per_day,
      mb.total_revenue_period,
      ROUND(swa.total_stok / mb.qty_per_day, 1) AS cover_days
    FROM stock_with_age swa
    JOIN movement_base mb ON mb.kode = swa.kode
  ),
  dead_stock_base AS (
    SELECT kode, days_since_last_sale
    FROM stock_with_age
    WHERE last_sale_date IS NULL OR days_since_last_sale > p_dead_stock_days
  ),
  overstock_base AS (
    SELECT kode, cover_days FROM cover_base WHERE cover_days > p_overstock_cover_days
  ),
  understock_base AS (
    SELECT kode, cover_days FROM cover_base WHERE cover_days < p_low_stock_cover_days
  ),
  restock_base AS (
    SELECT
      kode,
      total_revenue_period,
      cover_days,
      GREATEST(0, ROUND(qty_per_day * p_restock_target_days - total_stok)) AS suggested_qty
    FROM cover_base
  ),
  restock_needed AS (
    SELECT * FROM restock_base WHERE suggested_qty > 0
  ),
  restock_priority_base AS (
    SELECT kode,
      ROUND(total_revenue_period / GREATEST(cover_days, 0.1)) AS priority_score
    FROM restock_needed
  ),
  critical_base AS (
    SELECT kode, cover_days AS days_value FROM cover_base WHERE cover_days < p_critical_cover_days
  ),
  risk_combined AS (
    SELECT kode, days_since_last_sale AS days_value, 'dead' AS category, 0 AS sort_bucket
    FROM dead_stock_base
    UNION ALL
    SELECT kode, days_value, 'critical' AS category, 1 AS sort_bucket
    FROM critical_base
    WHERE kode NOT IN (SELECT kode FROM dead_stock_base)
  ),
  health_counts AS (
    SELECT
      (SELECT COUNT(*) FROM dead_stock_base) AS dead,
      (SELECT COUNT(*) FROM critical_base WHERE kode NOT IN (SELECT kode FROM dead_stock_base)) AS critical,
      (SELECT COUNT(*) FROM understock_base
        WHERE cover_days >= p_critical_cover_days AND kode NOT IN (SELECT kode FROM dead_stock_base)) AS low,
      (SELECT COUNT(*) FROM overstock_base WHERE kode NOT IN (SELECT kode FROM dead_stock_base)) AS overstock,
      (SELECT COUNT(*) FROM cover_base
        WHERE cover_days >= p_low_stock_cover_days AND cover_days <= p_overstock_cover_days
        AND kode NOT IN (SELECT kode FROM dead_stock_base)) AS healthy,
      (SELECT COUNT(*) FROM stock_with_age swa
        WHERE swa.kode NOT IN (SELECT kode FROM movement_base)
          AND swa.kode NOT IN (SELECT kode FROM dead_stock_base)) AS no_movement_period
  ),
  inv_summary AS (
    SELECT
      COALESCE((
        SELECT SUM(sa.total_stok * COALESCE(p.hpp, 0))
        FROM stok_agg sa LEFT JOIN products p ON p.kode = sa.kode
      ), 0) AS total_inventory_value,
      (SELECT COUNT(*) FROM stok_agg) AS total_sku_with_stock,
      COALESCE((
        SELECT SUM(qty * hpp) / (SELECT n FROM days_period)
        FROM filtered WHERE type = 'sale'
      ), 0) AS avg_daily_cogs
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalInventoryValue', (SELECT total_inventory_value FROM inv_summary),
      'totalSkuWithStock', (SELECT total_sku_with_stock FROM inv_summary),
      'avgDailyCogs', ROUND((SELECT avg_daily_cogs FROM inv_summary)),
      'daysOfInventory', CASE WHEN (SELECT avg_daily_cogs FROM inv_summary) > 0
        THEN ROUND((SELECT total_inventory_value FROM inv_summary) / (SELECT avg_daily_cogs FROM inv_summary), 1)
        ELSE 0 END,
      'inventoryTurnover', CASE WHEN (SELECT avg_daily_cogs FROM inv_summary) > 0
          AND (SELECT total_inventory_value FROM inv_summary) > 0
        THEN ROUND((SELECT n FROM days_period) /
          ((SELECT total_inventory_value FROM inv_summary) / (SELECT avg_daily_cogs FROM inv_summary)), 2)
        ELSE 0 END,
      'method', 'days_of_inventory_from_current_stock_and_period_cogs'
    ),
    'stockHealth', jsonb_build_object(
      'dead', (SELECT dead FROM health_counts),
      'critical', (SELECT critical FROM health_counts),
      'low', (SELECT low FROM health_counts),
      'healthy', (SELECT healthy FROM health_counts),
      'overstock', (SELECT overstock FROM health_counts),
      'noMovementPeriod', (SELECT no_movement_period FROM health_counts)
    ),
    'deadStock', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', days_since_last_sale)
        ORDER BY days_since_last_sale DESC NULLS FIRST)
      FROM (SELECT * FROM dead_stock_base ORDER BY days_since_last_sale DESC NULLS FIRST LIMIT 20) t
    ), '[]'::jsonb),
    'agingStock', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', days_since_last_sale) ORDER BY days_since_last_sale DESC)
      FROM (
        SELECT kode, days_since_last_sale FROM stock_with_age
        WHERE days_since_last_sale IS NOT NULL
        ORDER BY days_since_last_sale DESC LIMIT 10
      ) t
    ), '[]'::jsonb),
    'overstock', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', cover_days) ORDER BY cover_days DESC)
      FROM (SELECT * FROM overstock_base ORDER BY cover_days DESC LIMIT 10) t
    ), '[]'::jsonb),
    'understock', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', cover_days) ORDER BY cover_days ASC)
      FROM (SELECT * FROM understock_base ORDER BY cover_days ASC LIMIT 10) t
    ), '[]'::jsonb),
    'suggestedRestock', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', suggested_qty) ORDER BY suggested_qty DESC)
      FROM (SELECT * FROM restock_needed ORDER BY suggested_qty DESC LIMIT 10) t
    ), '[]'::jsonb),
    'restockPriority', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', priority_score) ORDER BY priority_score DESC)
      FROM (SELECT * FROM restock_priority_base ORDER BY priority_score DESC LIMIT 10) t
    ), '[]'::jsonb),
    'stockRiskIndicator', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', days_value, 'category', category)
        ORDER BY sort_bucket ASC, days_value DESC NULLS FIRST)
      FROM (SELECT * FROM risk_combined ORDER BY sort_bucket ASC, days_value DESC NULLS FIRST LIMIT 15) t
    ), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_inventory(date, date, text, text, integer, integer, integer, integer, integer) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- SELECT proname FROM pg_proc WHERE proname = 'analytics_inventory';
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'analytics_inventory';
--
-- Cek 30 hari terakhir, semua market/produk, threshold default:
-- SELECT jsonb_pretty(public.analytics_inventory(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL, 7, 3, 60, 30, 30));
-- ────────────────────────────────────────────────────────────
