-- ============================================================
-- Analytics (BI) — Phase 2: analytics_products()
--
-- Lanjutan dari Phase 1 (sales_flat + analytics_trend + analytics_overview,
-- lihat 20260712_analytics_phase1_rpc.sql). Scope migration ini HANYA 1
-- fungsi baru: analytics_products() untuk tab Products — mengikuti desain
-- yang sudah disepakati di ANALYTICS_ARCHITECTURE_PLAN.md §5.4 dan
-- keputusan final Denny di §12. TIDAK ada perubahan pada sales_flat(),
-- analytics_trend(), atau analytics_overview() yang sudah ada (Phase 1
-- tetap dipakai APA ADANYA, hanya di-reuse via FROM sales_flat(...)).
--
-- Filosofi SAMA seperti seluruh RPC Analytics sebelumnya: PostgreSQL =
-- seluruh business logic & agregasi, frontend HANYA memanggil RPC,
-- menerima hasil akhir (array of {kode, value}), dan me-render lewat
-- .map() murni — TIDAK ADA reduce/sort/filter bisnis di frontend.
--
-- CATATAN PENTING soal identitas produk di output: setiap entri leaderboard
-- HANYA berisi {kode, value} — SENGAJA TIDAK JOIN ke `products` untuk field
-- `nama` (berbeda dari quickInsight di analytics_overview yang JOIN nama).
-- Ini instruksi eksplisit Denny untuk tab Products — frontend cukup
-- menampilkan kode produk apa adanya, tidak perlu nama.
--
-- ════════════════════════════════════════════════════════════
-- analytics_products(p_from, p_to, p_location, p_kode, p_low_stock_cover_days)
-- ════════════════════════════════════════════════════════════
--
-- Dibangun di atas sales_flat() (Phase 1, §1) untuk seluruh metric berbasis
-- transaksi — TIDAK menulis ulang logika unnest items/tanda retur.
-- Tambahan JOIN ke `stok_warna` (pola sama dengan get_stock_summary, lihat
-- 20260711_migration_phase1_rpc_stock_summary.sql) untuk metric Inventory,
-- dan ke `products`/`sales` mentah (all-time, TANPA sales_flat) khusus
-- untuk `tidakPernahTerjual` — lihat catatan scope waktu di bawah.
--
-- Parameter:
--   p_location   NULL = semua market. TIDAK ADA breakdown per-market di
--                output RPC ini (keputusan eksplisit: "Pasar tidak relevan
--                pada tab ini selain sebagai filter global") — p_location
--                HANYA mempersempit data (leaderboard/harga/movement dari
--                sales_flat, DAN stok dari stok_warna direduksi ke kolom
--                lokasi tsb saja, DAN cek "pernah terjual" dibatasi ke
--                lokasi tsb saja) tanpa pernah muncul sebagai dimensi
--                GROUP BY di hasilnya.
--   p_kode       NULL = semua produk (kalau diisi, seluruh list otomatis
--                cuma berisi 1 kode itu — tetap valid, bukan kondisi error).
--   p_low_stock_cover_days  Ambang "hampir habis" dalam HARI COVER, default
--                7 kalau NULL/tidak dikirim. Dikirim sebagai PARAMETER dari
--                frontend (constants.js LOW_STOCK_COVER_DAYS), BUKAN
--                di-hardcode di SQL — supaya bisa disesuaikan tanpa
--                migration baru (keputusan final §12 poin 5).
--
-- Return jsonb:
--   {
--     leaderboard: {
--       terlaris:        [{kode, value}, ...],  -- value = SUM(qty) periode
--       omsetTertinggi:  [{kode, value}, ...],  -- value = SUM(revenue)
--       profitTertinggi: [{kode, value}, ...],  -- value = SUM(profit)
--       marginTertinggi: [{kode, value}, ...],  -- value = profit/revenue (rasio 0..1)
--       marginTerendah:  [{kode, value}, ...]
--     },
--     harga: {
--       hppTertinggi:        [{kode, value}, ...],  -- MAX(item.hpp) transaksi periode
--       hppTerendah:         [{kode, value}, ...],  -- MIN(item.hpp) transaksi periode
--       hargaJualTertinggi:  [{kode, value}, ...],  -- MAX(item.harga) transaksi periode
--       hargaJualTerendah:   [{kode, value}, ...]   -- MIN(item.harga) transaksi periode
--     },
--     movement: {
--       fastMoving: [{kode, value}, ...],  -- value = qty per hari (SUM(qty)/hari periode)
--       slowMoving: [{kode, value}, ...]
--     },
--     inventory: {
--       stokTerbanyak:            [{kode, value}, ...],  -- value = total stok (sesuai p_location)
--       stokHampirHabis:          [{kode, value}, ...],  -- value = hari cover (stok/qty-per-hari)
--       tidakPernahTerjual:       [{kode, value}, ...],  -- value = stok saat ini, ALL-TIME check
--       tidakAdaPenjualanPeriode: [{kode, value}, ...]   -- value = stok saat ini, scope periode filter
--     }
--   }
--
-- Setiap list dibatasi LIMIT 10 di level SQL (konsisten dengan
-- PRODUCTS_LEADERBOARD_LIMIT di constants.js FE — konstanta itu HANYA
-- untuk label UI "Top 10", bukan pembatas data; pembatas sesungguhnya ada
-- di sini, sama seperti pola TOP_PRODUCT_TREND_LIMIT di analytics_trend).
--
-- ────────────────────────────────────────────────────────────
-- Business rule per section (keputusan final Denny, ANALYTICS_ARCHITECTURE_PLAN.md §12)
-- ────────────────────────────────────────────────────────────
--
-- leaderboard:
--   - terlaris/omsetTertinggi/profitTertinggi HANYA menyertakan kode dengan
--     value > 0 (qty/revenue/profit BERSIH positif setelah retur). Ini
--     KOREKSI YANG DISENGAJA terhadap notasi ringkas "ORDER BY SUM(...)
--     DESC" di §3.2 — tanpa filter ini, kode dengan retur lebih besar dari
--     penjualannya (net negatif) tetap BISA nongol di leaderboard "top 10"
--     kalau kebetulan jumlah produk yang punya transaksi < 10, padahal itu
--     bukan produk "terlaris"/"omset tertinggi" secara wajar — sama seperti
--     pola koreksi totalTransaksi di analytics_overview (Phase 1).
--   - marginTertinggi/marginTerendah HANYA mempertimbangkan kode dengan
--     total_revenue > 0 (margin = profit/revenue, hanya masuk akal untuk
--     revenue positif — pembagian oleh nol/negatif dikecualikan, sesuai
--     §3.2 "Margin % — hanya masuk akal untuk produk dengan revenue > 0").
--     marginTerendah SENGAJA TIDAK memfilter margin negatif — margin
--     negatif (harga jual < HPP transaksi) justru harus tetap tampil di
--     posisi paling bawah sebagai sinyal produk bermasalah (lihat usulan
--     "Margin Negatif" di §4 poin 8 dokumen desain).
--
-- harga (keputusan final §12 poin 2 — dari TRANSAKSI AKTUAL, bukan master):
--   - hppTertinggi/Terendah = MAX/MIN(item.hpp) dari sales_flat pada
--     kode×periode×filter yang sama (SNAPSHOT HPP saat transaksi, sama
--     seperti prinsip profit di sales_flat — BUKAN join ke products.hpp
--     saat ini).
--   - hargaJualTertinggi/Terendah = MAX/MIN(item.harga) dari sales_flat —
--     BUKAN dari products.variants[].harga (katalog), karena kasir POS
--     mengizinkan override harga manual saat checkout (lihat
--     ANALYTICS_ARCHITECTURE_PLAN.md §8.2) — angka ini mencerminkan harga
--     jual SESUNGGUHNYA yang terjadi di transaksi, konsisten dengan
--     prinsip "semua widget Products mengikuti Global Filter".
--
-- movement (keputusan final §12: qty terjual ÷ jumlah hari periode):
--   - qty_per_day = SUM(qty periode) / GREATEST(1, jumlah_hari_periode) —
--     GREATEST(1, ...) mencegah pembagian oleh nol kalau p_from = p_to
--     (periode 1 hari, jumlah hari = 1, bukan 0).
--   - fastMoving/slowMoving HANYA menyertakan kode dengan total_qty > 0
--     dalam periode (produk dengan qty = 0 BUKAN "slow moving", melainkan
--     "tidak ada penjualan" — masuk kategori terpisah
--     `tidakAdaPenjualanPeriode`, PERSIS instruksi "Produk dengan qty
--     terjual = 0 JANGAN dihitung hari cover... masukkan ke
--     tidakAdaPenjualanPeriode" — aturan yang sama juga berlaku di sini,
--     bukan hanya untuk stokHampirHabis, supaya definisi "Slow Moving" dan
--     "Tidak Ada Penjualan" tidak tumpang tindih/ambigu).
--
-- inventory:
--   - Semua metric Inventory MENGHORMATI p_location: kalau diisi salah satu
--     dari 'gudang'/'cideng'/'tegalgubug', total stok HANYA dihitung dari
--     kolom lokasi tsb (bukan dijumlah lintas 3 lokasi). Lokasi yang TIDAK
--     dikenal (typo) menghasilkan stok 0 (BUKAN fallback diam-diam ke
--     "semua lokasi") — konsisten dengan pola RPC lain di repo ini yang
--     memperlakukan filter tidak match sebagai "tidak ada data", bukan
--     "abaikan filter".
--   - stokHampirHabis = hari cover (`total_stok / qty_per_day`), HANYA
--     dihitung untuk kode dengan qty_per_day > 0 (JOIN ke movement_base,
--     otomatis mengecualikan qty=0 — pembagian oleh nol dihindari dengan
--     sendirinya karena JOIN, bukan LEFT JOIN). Ambang "hampir habis" <
--     p_low_stock_cover_days (default 7).
--   - tidakAdaPenjualanPeriode = kode YANG PUNYA STOK (ada baris di
--     stok_warna, sesuai filter p_location/p_kode) TAPI TIDAK PUNYA
--     penjualan bersih positif dalam periode filter (qty=0 ATAU tidak
--     muncul sama sekali di sales_flat periode ini) — value = stok saat
--     ini, supaya Denny langsung tahu berapa banyak stok yang "diam" di
--     periode tsb.
--   - tidakPernahTerjual = **ALL-TIME**, keputusan final §12 poin 3 — TIDAK
--     dibatasi p_from/p_to seperti bagian lain RPC ini. Query pendukungnya
--     SENGAJA membaca `sales` mentah (bukan `sales_flat(p_from,p_to)`,
--     yang menurut definisinya SELALU dibatasi rentang) untuk cek "kode ini
--     PERNAH muncul di sales.items KAPAN SAJA dalam sejarah, sale ATAUPUN
--     retur (retur menyiratkan kode tsb pernah terjual sebelumnya)". Ini
--     adalah SATU LAGI kasus di mana 1 field dalam sebuah RPC sengaja punya
--     scope waktu berbeda dari field lain di RPC yang sama — WAJIB dibaca
--     sebagai keputusan desain, BUKAN bug. Basis kandidat "produk" berasal
--     dari tabel `products` (bukan stok_warna) supaya produk dengan stok 0
--     DI SEMUA LOKASI (baris stok_warna tidak ada sama sekali) tetap
--     terdeteksi sebagai "tidak pernah terjual" kalau memang belum pernah
--     ada transaksinya.
--
-- Edge case:
--   - Tidak ada transaksi sama sekali pada rentang/filter -> seluruh
--     leaderboard/harga/movement = [] (CTE `agg` kosong -> setiap turunan
--     ikut kosong -> COALESCE(..., '[]'::jsonb) di SELECT akhir).
--   - `stok_warna` kosong -> inventory.stokTerbanyak/stokHampirHabis = [],
--     tidakAdaPenjualanPeriode = [] (tidak ada baris stok untuk dicek).
--   - `products` kosong -> tidakPernahTerjual = [].
--   - p_from > p_to -> sales_flat 0 baris (BETWEEN terbalik tidak match
--     apa pun) -> hasil sama seperti "tidak ada transaksi" (bukan error),
--     konsisten dengan seluruh RPC Analytics lain.
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Tidak mengubah sales_flat(),
-- analytics_trend(), analytics_overview(), atau tabel/index apa pun yang
-- sudah ada. Tidak membuat tabel/index/trigger/view baru.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_products(
  p_from                  date,
  p_to                    date,
  p_location              text,
  p_kode                  text,
  p_low_stock_cover_days  integer DEFAULT 7
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
  agg AS (
    SELECT
      kode,
      SUM(qty)     AS total_qty,
      SUM(revenue) AS total_revenue,
      SUM(profit)  AS total_profit,
      MAX(harga)   AS harga_max,
      MIN(harga)   AS harga_min,
      MAX(hpp)     AS hpp_max,
      MIN(hpp)     AS hpp_min
    FROM filtered
    GROUP BY kode
  ),
  days_period AS (
    SELECT GREATEST(1, (p_to - p_from + 1))::numeric AS n
  ),

  -- ── leaderboard ──────────────────────────────────────────
  terlaris AS (
    SELECT kode, total_qty AS value
    FROM agg WHERE total_qty > 0
    ORDER BY total_qty DESC LIMIT 10
  ),
  omset_tertinggi AS (
    SELECT kode, total_revenue AS value
    FROM agg WHERE total_revenue > 0
    ORDER BY total_revenue DESC LIMIT 10
  ),
  profit_tertinggi AS (
    SELECT kode, total_profit AS value
    FROM agg WHERE total_profit > 0
    ORDER BY total_profit DESC LIMIT 10
  ),
  margin_base AS (
    SELECT kode, (total_profit / total_revenue) AS margin
    FROM agg
    WHERE total_revenue > 0
  ),
  margin_tertinggi AS (
    SELECT kode, margin AS value FROM margin_base ORDER BY margin DESC LIMIT 10
  ),
  margin_terendah AS (
    SELECT kode, margin AS value FROM margin_base ORDER BY margin ASC LIMIT 10
  ),

  -- ── harga (dari transaksi aktual, lihat catatan §12 poin 2) ──
  hpp_tertinggi AS (
    SELECT kode, hpp_max AS value FROM agg ORDER BY hpp_max DESC LIMIT 10
  ),
  hpp_terendah AS (
    SELECT kode, hpp_min AS value FROM agg ORDER BY hpp_min ASC LIMIT 10
  ),
  harga_jual_tertinggi AS (
    SELECT kode, harga_max AS value FROM agg ORDER BY harga_max DESC LIMIT 10
  ),
  harga_jual_terendah AS (
    SELECT kode, harga_min AS value FROM agg ORDER BY harga_min ASC LIMIT 10
  ),

  -- ── movement ─────────────────────────────────────────────
  movement_base AS (
    SELECT kode, (total_qty / (SELECT n FROM days_period)) AS qty_per_day
    FROM agg
    WHERE total_qty > 0
  ),
  fast_moving AS (
    SELECT kode, ROUND(qty_per_day, 2) AS value
    FROM movement_base ORDER BY qty_per_day DESC LIMIT 10
  ),
  slow_moving AS (
    SELECT kode, ROUND(qty_per_day, 2) AS value
    FROM movement_base ORDER BY qty_per_day ASC LIMIT 10
  ),

  -- ── inventory ────────────────────────────────────────────
  stok_agg AS (
    SELECT
      kode,
      CASE
        WHEN p_location IS NULL       THEN SUM(gudang + cideng + tegalgubug)
        WHEN p_location = 'gudang'    THEN SUM(gudang)
        WHEN p_location = 'cideng'    THEN SUM(cideng)
        WHEN p_location = 'tegalgubug' THEN SUM(tegalgubug)
        ELSE 0
      END AS total_stok
    FROM stok_warna
    WHERE (p_kode IS NULL OR kode = p_kode)
    GROUP BY kode
  ),
  stok_terbanyak AS (
    SELECT kode, total_stok AS value
    FROM stok_agg ORDER BY total_stok DESC LIMIT 10
  ),
  stok_hampir_habis AS (
    SELECT
      sa.kode,
      ROUND(sa.total_stok / mb.qty_per_day, 1) AS value
    FROM stok_agg sa
    JOIN movement_base mb ON mb.kode = sa.kode
    WHERE (sa.total_stok / mb.qty_per_day) < COALESCE(p_low_stock_cover_days, 7)
    ORDER BY value ASC
    LIMIT 10
  ),
  tidak_ada_penjualan AS (
    SELECT sa.kode, sa.total_stok AS value
    FROM stok_agg sa
    LEFT JOIN agg a ON a.kode = sa.kode AND a.total_qty > 0
    WHERE a.kode IS NULL
    ORDER BY sa.total_stok DESC
    LIMIT 10
  ),
  ever_sold AS (
    -- ALL-TIME, TANPA sales_flat(p_from,p_to) — lihat catatan scope waktu
    -- di komentar atas. Sale ATAUPUN retur dihitung sebagai "pernah
    -- terjual" (retur menyiratkan penjualan sebelumnya pernah terjadi).
    SELECT DISTINCT item ->> 'kode' AS kode
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    WHERE (p_location IS NULL OR s.location = p_location)
  ),
  tidak_pernah_terjual AS (
    SELECT p.kode, COALESCE(sa.total_stok, 0) AS value
    FROM products p
    LEFT JOIN stok_agg sa ON sa.kode = p.kode
    WHERE (p_kode IS NULL OR p.kode = p_kode)
      AND p.kode NOT IN (SELECT kode FROM ever_sold WHERE kode IS NOT NULL)
    ORDER BY value DESC
    LIMIT 10
  )

  SELECT jsonb_build_object(
    'leaderboard', jsonb_build_object(
      'terlaris', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM terlaris),
        '[]'::jsonb
      ),
      'omsetTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM omset_tertinggi),
        '[]'::jsonb
      ),
      'profitTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM profit_tertinggi),
        '[]'::jsonb
      ),
      'marginTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM margin_tertinggi),
        '[]'::jsonb
      ),
      'marginTerendah', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value ASC) FROM margin_terendah),
        '[]'::jsonb
      )
    ),
    'harga', jsonb_build_object(
      'hppTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM hpp_tertinggi),
        '[]'::jsonb
      ),
      'hppTerendah', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value ASC) FROM hpp_terendah),
        '[]'::jsonb
      ),
      'hargaJualTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM harga_jual_tertinggi),
        '[]'::jsonb
      ),
      'hargaJualTerendah', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value ASC) FROM harga_jual_terendah),
        '[]'::jsonb
      )
    ),
    'movement', jsonb_build_object(
      'fastMoving', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM fast_moving),
        '[]'::jsonb
      ),
      'slowMoving', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value ASC) FROM slow_moving),
        '[]'::jsonb
      )
    ),
    'inventory', jsonb_build_object(
      'stokTerbanyak', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM stok_terbanyak),
        '[]'::jsonb
      ),
      'stokHampirHabis', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value ASC) FROM stok_hampir_habis),
        '[]'::jsonb
      ),
      'tidakPernahTerjual', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM tidak_pernah_terjual),
        '[]'::jsonb
      ),
      'tidakAdaPenjualanPeriode', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) FROM tidak_ada_penjualan),
        '[]'::jsonb
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_products(date, date, text, text, integer) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'analytics_products';
--
-- Cek grant:
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'analytics_products';
--
-- Cek hasil untuk 30 hari terakhir, semua market/produk, threshold default 7 hari:
-- SELECT jsonb_pretty(public.analytics_products(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL, 7));
--
-- Cek movement (fastMoving) TIDAK memasukkan kode dengan qty periode = 0:
-- SELECT jsonb_pretty(public.analytics_products(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL, 7) -> 'movement' -> 'fastMoving');
--
-- Cek tidakPernahTerjual benar ALL-TIME (bandingkan manual, HARUS sama
-- walau p_from/p_to diganti-ganti):
-- SELECT jsonb_pretty(public.analytics_products('2026-07-01','2026-07-31',NULL,NULL,7) -> 'inventory' -> 'tidakPernahTerjual');
-- SELECT jsonb_pretty(public.analytics_products('2020-01-01','2020-01-31',NULL,NULL,7) -> 'inventory' -> 'tidakPernahTerjual');
-- (kedua hasil di atas HARUS SAMA — scope-nya all-time, bukan ikut p_from/p_to)
--
-- Cek stokHampirHabis mengecualikan kode dengan qty_per_day = 0 (dibanding manual):
-- SELECT kode, SUM(gudang+cideng+tegalgubug) AS total_stok FROM stok_warna GROUP BY kode ORDER BY total_stok ASC LIMIT 20;
-- ────────────────────────────────────────────────────────────
