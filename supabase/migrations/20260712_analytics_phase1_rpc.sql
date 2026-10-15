-- ============================================================
-- Analytics (BI) — Phase 1: sales_flat() + analytics_trend() + analytics_overview()
--
-- Implementasi PERTAMA dari fitur Analytics baru di apps/admin, mengikuti
-- desain yang sudah disepakati di ANALYTICS_ARCHITECTURE_PLAN.md (§5.1-5.3,
-- §12). Filosofi SAMA seperti seluruh migrasi RPC sebelumnya di repo ini
-- (approve_transfer, get_sales_summary_by_product, get_stock_summary,
-- get_laporan_produksi): PostgreSQL = seluruh business logic & agregasi,
-- frontend HANYA memanggil RPC, menerima hasil akhir, dan me-render.
--
-- Scope migration ini HANYA 3 fungsi (Phase 1 fitur Analytics — Overview +
-- Trends). TIDAK ada fungsi Products/Markets/Customers (itu Phase 2-4,
-- lihat roadmap di ANALYTICS_ARCHITECTURE_PLAN.md §7) — SENGAJA tidak
-- diimplementasikan di sini sesuai instruksi eksplisit.
--
-- ════════════════════════════════════════════════════════════
-- 1. sales_flat(p_from, p_to) — lapisan dasar (BUKAN dipanggil langsung
--    dari frontend, tapi di-GRANT ke authenticated untuk keperluan
--    query/debug manual oleh admin lewat SQL editor)
-- ════════════════════════════════════════════════════════════
--
-- Tujuan: satu-satunya tempat yang tahu cara "meratakan" (flatten) kolom
-- `sales.items` (jsonb) jadi baris per kode×warna, dengan tanda (+/-) sudah
-- diterapkan untuk retur. SETIAP RPC Analytics lain (analytics_trend,
-- analytics_overview, dan RPC Products/Markets/Customers di Phase
-- berikutnya) WAJIB dibangun di atas fungsi ini — TIDAK ADA yang boleh
-- menulis ulang logika unnest jsonb secara terpisah. Ini persis prinsip
-- "dependency antar RPC agar tidak ada duplikasi query" yang diminta.
--
-- Business logic yang direplikasi dari kode lama (diverifikasi langsung ke
-- apps/pos/src/features/kasir/hooks.js dan packages/shared/lib/bepUtils.js
-- — BUKAN dari komentar lama di supabase-migration-sales-table.sql yang
-- sudah tidak akurat, lihat catatan "item TIDAK punya field nama" di
-- ANALYTICS_ARCHITECTURE_PLAN.md §1.1):
--
--   - Satu baris `sales.items[]` ("item") bisa punya QTY dalam salah satu
--     dari 2 bentuk:
--       (a) flat: {"qty": N}                          -- tanpa warna
--       (b) per-warna: {"warna": [{"nama":"HITAM","qty":N}, ...]}
--     Fungsi ini MENYATUKAN keduanya jadi satu bentuk baris per warna
--     (warna = NULL untuk kasus flat).
--   - PENTING (bug lama yang HAMPIR ke-replikasi salah saat desain
--     awal): kode JS asli (`effQty()` di bepUtils.js) mensyaratkan
--     `Array.isArray(item.warna) && item.warna.length > 0` sebelum
--     menganggap "ini item per-warna" — array KOSONG `[]` tetap dianggap
--     kasus FLAT (fallback ke item.qty), BUKAN "0 baris". SQL di bawah
--     mereplikasi ini persis via `jsonb_array_length(...) > 0`, bukan
--     hanya `jsonb_typeof(...) = 'array'` saja (yang akan salah
--     menghasilkan NOL baris untuk array kosong, alih-alih fallback).
--   - Tanda (+/-): `type = 'retur'` MEMBALIK tanda qty/revenue/profit
--     (mengurangi), `type = 'sale'` (atau nilai lain) tidak dibalik —
--     pola identik dengan `sign = type === "retur" ? -1 : 1` di
--     bepUtils.js.
--   - `revenue` per baris = qty_bertanda × harga. `profit` per baris =
--     qty_bertanda × (harga − hpp). `hpp` di sini adalah SNAPSHOT
--     `products.hpp` PADA SAAT TRANSAKSI (`item.hpp`, diisi kasir dari
--     `product.hpp` saat checkout — lihat kasir/hooks.js baris
--     `hpp: product.hpp ?? 0`), BUKAN join ulang ke tabel products/
--     hpp_template saat ini. Ini SENGAJA — supaya profit histori TIDAK
--     berubah retroaktif kalau HPP produk diedit di kemudian hari.
--   - `harga`/`hpp`/`qty` yang tidak bisa dibaca sebagai angka (field
--     hilang/null) di-COALESCE ke 0 — setara `Number(x) ?? 0`/`?? 0` di
--     JS yang tidak pernah error.
--   - Filter tanggal: `s.date BETWEEN p_from AND p_to` (inklusif kedua
--     ujung).
--
-- Edge case:
--   - `sales.items` NULL atau `[]` → tidak menghasilkan baris apa pun
--     untuk sale itu (COALESCE ke '[]'::jsonb sebelum jsonb_array_elements
--     supaya tidak error saat items NULL — jsonb_array_elements(NULL)
--     akan error kalau tidak di-COALESCE).
--   - Item TANPA field `warna` sama sekali (data sangat lama) →
--     `item -> 'warna'` = SQL NULL → `jsonb_typeof(NULL)` = SQL NULL →
--     kondisi `= 'array'` bernilai NULL (falsy di CASE WHEN) → jatuh ke
--     cabang flat (`item -> 'qty'`), sama seperti `Array.isArray(undefined)`
--     = false di JS.
--   - Item dengan `warna` array TAPI elemen `qty`-nya bukan angka valid →
--     COALESCE ke 0 (tidak pernah error, konsisten dengan pola RPC
--     lain di repo ini seperti get_sales_summary_by_product).
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Tidak mengubah tabel/migration
-- lain, tidak membuat tabel/index/trigger/view baru.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sales_flat(p_from date, p_to date)
RETURNS TABLE (
  sale_id      uuid,
  tanggal      date,
  location     text,
  type         text,
  pelanggan_id uuid,
  kode         text,
  warna        text,
  qty          numeric,   -- SUDAH bertanda (+/-) sesuai type
  harga        numeric,
  hpp          numeric,
  revenue      numeric,   -- SUDAH bertanda: qty_bertanda * harga
  profit       numeric    -- SUDAH bertanda: qty_bertanda * (harga - hpp)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.date,
    s.location,
    s.type,
    s.pelanggan_id,
    item ->> 'kode',
    w.warna,
    (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) * w.qty,
    COALESCE((item ->> 'harga')::numeric, 0),
    COALESCE((item ->> 'hpp')::numeric, 0),
    (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) * w.qty
      * COALESCE((item ->> 'harga')::numeric, 0),
    (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) * w.qty
      * (COALESCE((item ->> 'harga')::numeric, 0) - COALESCE((item ->> 'hpp')::numeric, 0))
  FROM sales s
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
  CROSS JOIN LATERAL (
    SELECT
      welem ->> 'nama' AS warna,
      COALESCE((welem ->> 'qty')::numeric, 0) AS qty
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array'
             AND jsonb_array_length(item -> 'warna') > 0
          THEN item -> 'warna'
        ELSE jsonb_build_array(jsonb_build_object('nama', NULL, 'qty', item -> 'qty'))
      END
    ) AS welem
  ) w
  WHERE s.date BETWEEN p_from AND p_to;
$$;

GRANT EXECUTE ON FUNCTION public.sales_flat(date, date) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- 2. analytics_trend(p_from, p_to, p_location, p_kode, p_granularity)
-- ════════════════════════════════════════════════════════════
--
-- Dipakai LANGSUNG oleh tab Trends (user memilih granularity), dan
-- dipanggil INTERNAL oleh analytics_overview() (granularity otomatis,
-- hanya field `buckets` yang dipakai untuk 3 chart kecil di Overview) —
-- lihat dependency graph di ANALYTICS_ARCHITECTURE_PLAN.md §5.8. Tidak
-- ada logika trend yang ditulis dua kali di dua RPC berbeda.
--
-- Parameter:
--   p_location    NULL = semua market (Gudang/Cideng/Tegalgubug)
--   p_kode        NULL = semua produk
--   p_granularity 'day' | 'week' | 'month' | 'year' — nilai lain
--                 (termasuk NULL) FALLBACK ke 'day', tidak error.
--
-- Return jsonb:
--   {
--     granularity: "day",
--     buckets: [{periode, revenue, profit, qty}, ...],
--     topProductTrend: [{kode, nama, points:[{periode, qty}, ...]}, ...],  -- top 5 by total qty
--     marketTrend: [{location, points:[{periode, revenue}, ...]}, ...]
--   }
--
-- Business logic:
--   - `buckets` = SUM(revenue/profit/qty) dari sales_flat, di-GROUP BY
--     date_trunc(granularity, tanggal).
--   - `topProductTrend` = 5 kode dengan SUM(qty) TERBESAR pada rentang &
--     filter yang diminta (bukan all-time), lalu masing-masing di-bucket
--     ulang per periode yang sama.
--   - `marketTrend` = SUM(revenue) per lokasi per periode (lokasi NULL
--     dikecualikan — data location kosong dianggap tidak valid untuk
--     perbandingan pasar, sama seperti filter serupa di
--     get_sales_summary_by_product yang mensyaratkan location dikenal).
--
-- Edge case:
--   - Tidak ada transaksi sama sekali di rentang/filter → `buckets`,
--     `topProductTrend`, `marketTrend` semuanya `[]` (BUKAN null/error).
--   - `p_from > p_to` → `sales_flat` mengembalikan 0 baris (BETWEEN
--     dengan batas terbalik secara alami tidak match apa pun di
--     PostgreSQL) → hasil sama seperti "tidak ada transaksi".
--   - TIDAK ADA zero-filling untuk periode tanpa transaksi (mis. tanggal
--     yang tidak ada penjualan tidak muncul sebagai bucket dengan value
--     0) — SENGAJA, demi menghindari optimisasi/kompleksitas prematur
--     (generate_series per granularity) yang belum diminta. Kalau
--     frontend butuh grafik dengan sumbu-X kontinu tanpa lubang, ini jadi
--     kandidat perbaikan Phase 2 (dicatat juga di laporan implementasi).
--
-- Idempotent, SECURITY INVOKER, dibangun di atas sales_flat() (§1) —
-- tidak menulis ulang logika unnest jsonb.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_trend(
  p_from        date,
  p_to          date,
  p_location    text,
  p_kode        text,
  p_granularity text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH v_gran AS (
    SELECT CASE
      WHEN p_granularity IN ('day', 'week', 'month', 'year') THEN p_granularity
      ELSE 'day'
    END AS g
  ),
  filtered AS (
    SELECT sf.*
    FROM sales_flat(p_from, p_to) sf
    WHERE (p_location IS NULL OR sf.location = p_location)
      AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  bucketed AS (
    SELECT
      date_trunc((SELECT g FROM v_gran), f.tanggal)::date AS periode,
      SUM(f.revenue) AS revenue,
      SUM(f.profit)  AS profit,
      SUM(f.qty)     AS qty
    FROM filtered f
    GROUP BY periode
  ),
  buckets_json AS (
    SELECT jsonb_agg(
      jsonb_build_object('periode', periode, 'revenue', revenue, 'profit', profit, 'qty', qty)
      ORDER BY periode
    ) AS arr
    FROM bucketed
  ),
  top5 AS (
    SELECT f.kode, p.nama, SUM(f.qty) AS total_qty
    FROM filtered f
    LEFT JOIN products p ON p.kode = f.kode
    GROUP BY f.kode, p.nama
    ORDER BY total_qty DESC
    LIMIT 5
  ),
  top_product_points AS (
    SELECT
      t.kode,
      t.nama,
      jsonb_agg(
        jsonb_build_object('periode', b.periode, 'qty', b.qty)
        ORDER BY b.periode
      ) AS points
    FROM top5 t
    JOIN LATERAL (
      SELECT
        date_trunc((SELECT g FROM v_gran), f2.tanggal)::date AS periode,
        SUM(f2.qty) AS qty
      FROM filtered f2
      WHERE f2.kode = t.kode
      GROUP BY periode
    ) b ON true
    GROUP BY t.kode, t.nama
  ),
  top_product_trend_json AS (
    SELECT jsonb_agg(
      jsonb_build_object('kode', kode, 'nama', nama, 'points', points)
      ORDER BY kode
    ) AS arr
    FROM top_product_points
  ),
  market_bucketed AS (
    SELECT
      f.location,
      date_trunc((SELECT g FROM v_gran), f.tanggal)::date AS periode,
      SUM(f.revenue) AS revenue
    FROM filtered f
    WHERE f.location IS NOT NULL
    GROUP BY f.location, periode
  ),
  market_points AS (
    SELECT
      location,
      jsonb_agg(jsonb_build_object('periode', periode, 'revenue', revenue) ORDER BY periode) AS points
    FROM market_bucketed
    GROUP BY location
  ),
  market_trend_json AS (
    SELECT jsonb_agg(jsonb_build_object('location', location, 'points', points) ORDER BY location) AS arr
    FROM market_points
  )
  SELECT jsonb_build_object(
    'granularity', (SELECT g FROM v_gran),
    'buckets', COALESCE((SELECT arr FROM buckets_json), '[]'::jsonb),
    'topProductTrend', COALESCE((SELECT arr FROM top_product_trend_json), '[]'::jsonb),
    'marketTrend', COALESCE((SELECT arr FROM market_trend_json), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_trend(date, date, text, text, text) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- 3. analytics_overview(p_from, p_to, p_location, p_kode)
-- ════════════════════════════════════════════════════════════
--
-- RPC utama untuk tab Overview. Return jsonb siap-render, TIDAK
-- membutuhkan reduce/map/business logic apa pun di frontend.
--
-- Return jsonb:
--   {
--     kpi: { totalRevenue, totalProfit, totalQty, totalTransaksi, totalCustomer, aov },
--     quickInsight: {
--       produkTerlaris:        {kode, nama, value} | null,
--       produkProfitTertinggi: {kode, nama, value} | null,
--       pasarTerbaik:          {location, value}   | null,
--       customerTerbaik:       {pelangganId, nama, value} | null
--     },
--     marketSummary: [{location, revenue, profit, qty}, ...],
--     trend: { ...hasil analytics_trend() dengan granularity otomatis... }
--   }
--
-- Business rule per field (semua berdasarkan keputusan final Denny di
-- ANALYTICS_ARCHITECTURE_PLAN.md §12, kecuali disebutkan lain):
--   - totalRevenue/totalProfit/totalQty = SUM langsung dari sales_flat
--     (retur sudah bertanda negatif dari §1, TIDAK dikurangi lagi di sini).
--   - totalTransaksi = COUNT(DISTINCT sale_id) FILTER (type='sale').
--     PENTING: ini BUKAN `COUNT(*) WHERE type='sale'` seperti rumus
--     ringkas di ANALYTICS_ARCHITECTURE_PLAN.md §3.1 — rumus itu ditulis
--     terhadap tabel `sales` ASLI (1 baris = 1 transaksi). Karena RPC ini
--     dibangun di atas `sales_flat` yang SUDAH DIPECAH per item×warna (1
--     transaksi bisa jadi banyak baris), maka WAJIB `COUNT(DISTINCT
--     sale_id)` supaya 1 transaksi dengan banyak item tidak dihitung
--     berkali-kali. Ini KOREKSI YANG DISENGAJA terhadap notasi ringkas di
--     dokumen desain, BUKAN penyimpangan dari maksud aslinya — hasil
--     akhirnya tetap "jumlah transaksi type=sale", cuma cara
--     menghitungnya menyesuaikan bentuk data yang sudah diratakan.
--   - totalCustomer = COUNT(DISTINCT pelanggan_id) atas SEMUA baris
--     (sale maupun retur) yang lolos filter, mengecualikan NULL (walk-in
--     tanpa nama — lihat ANALYTICS_ARCHITECTURE_PLAN.md §8.3). Retur ikut
--     dihitung sebagai "customer" pada periode ini karena pelanggan
--     tersebut tetap berinteraksi dalam periode filter, bukan cuma
--     transaksi jual.
--   - aov (Average Order Value) = totalRevenue ÷ totalTransaksi, DIBULATKAN
--     ke integer terdekat (ROUND). 0 kalau totalTransaksi = 0 (bukan
--     error/NULL).
--   - produkTerlaris = kode dengan SUM(qty) terbesar. produkProfitTertinggi
--     = kode dengan SUM(profit) terbesar. Keduanya JOIN ke `products`
--     untuk `nama` (item.kode TIDAK punya field nama sendiri — lihat
--     catatan di §1). LIMIT 1 — kalau tidak ada data sama sekali, field
--     ini `null` (BUKAN objek kosong), frontend WAJIB menangani null.
--   - pasarTerbaik = lokasi dengan SUM(profit) terbesar (keputusan final
--     Denny: profit, BUKAN revenue — lokasi omset besar tapi margin
--     tipis tidak otomatis "terbaik").
--   - customerTerbaik = pelanggan dengan SUM(revenue) terbesar (revenue,
--     bukan profit — customerTerbaik dimaksudkan sebagai "siapa yang
--     paling banyak belanja", konsisten dengan leaderboard Customers di
--     Phase 4 nanti yang defaultnya diurutkan revenue). HANYA
--     mempertimbangkan baris dengan pelanggan_id terisi (JOIN, bukan LEFT
--     JOIN, ke pelanggan — walk-in otomatis tidak pernah muncul di sini).
--   - marketSummary = SUM per lokasi (lokasi NULL dikecualikan, sama
--     seperti marketTrend di analytics_trend).
--   - trend = hasil PEMANGGILAN LANGSUNG analytics_trend() (bukan logika
--     terpisah) dengan granularity OTOMATIS berdasarkan panjang rentang
--     filter: ≤ 31 hari → 'day', ≤ 180 hari → 'week', selebihnya →
--     'month'. Ambang batas ini murni heuristik UX (grafik tidak
--     berantakan kalau rentang panjang dipaksa granularity harian) —
--     BUKAN dependency baru yang perlu di-maintain terpisah, karena tetap
--     memanggil fungsi analytics_trend() yang sama persis dipakai tab
--     Trends.
--
-- Edge case:
--   - Rentang filter tanpa transaksi sama sekali → seluruh kpi = 0,
--     quickInsight seluruhnya null, marketSummary = [], trend.buckets = [].
--   - p_location/p_kode di luar nilai yang valid (mis. typo) → filter
--     WHERE tidak match apa pun → hasil sama seperti "tanpa transaksi"
--     (BUKAN error) — konsisten dengan pola RPC lain di repo ini yang
--     tidak melempar exception untuk filter yang valid secara tipe data
--     tapi tidak match apa pun secara isi.
--
-- Idempotent, SECURITY INVOKER, dibangun di atas sales_flat() (§1) dan
-- MEMANGGIL analytics_trend() (§2) — tidak menulis ulang logika trend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_overview(
  p_from     date,
  p_to       date,
  p_location text,
  p_kode     text
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
  ),
  kpi_base AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS total_revenue,
      COALESCE(SUM(profit), 0)  AS total_profit,
      COALESCE(SUM(qty), 0)     AS total_qty,
      COUNT(DISTINCT sale_id) FILTER (WHERE type = 'sale') AS total_transaksi,
      COUNT(DISTINCT pelanggan_id) FILTER (WHERE pelanggan_id IS NOT NULL) AS total_customer
    FROM filtered
  ),
  produk_terlaris AS (
    SELECT f.kode, p.nama, SUM(f.qty) AS value
    FROM filtered f
    LEFT JOIN products p ON p.kode = f.kode
    GROUP BY f.kode, p.nama
    ORDER BY value DESC
    LIMIT 1
  ),
  produk_profit AS (
    SELECT f.kode, p.nama, SUM(f.profit) AS value
    FROM filtered f
    LEFT JOIN products p ON p.kode = f.kode
    GROUP BY f.kode, p.nama
    ORDER BY value DESC
    LIMIT 1
  ),
  pasar_terbaik AS (
    SELECT location, SUM(profit) AS value
    FROM filtered
    WHERE location IS NOT NULL
    GROUP BY location
    ORDER BY value DESC
    LIMIT 1
  ),
  customer_terbaik AS (
    SELECT f.pelanggan_id, pl.nama, SUM(f.revenue) AS value
    FROM filtered f
    JOIN pelanggan pl ON pl.id = f.pelanggan_id
    GROUP BY f.pelanggan_id, pl.nama
    ORDER BY value DESC
    LIMIT 1
  ),
  market_summary AS (
    SELECT location, SUM(revenue) AS revenue, SUM(profit) AS profit, SUM(qty) AS qty
    FROM filtered
    WHERE location IS NOT NULL
    GROUP BY location
  ),
  market_summary_json AS (
    SELECT jsonb_agg(
      jsonb_build_object('location', location, 'revenue', revenue, 'profit', profit, 'qty', qty)
      ORDER BY location
    ) AS arr
    FROM market_summary
  ),
  gran AS (
    SELECT CASE
      WHEN (p_to - p_from) <= 31  THEN 'day'
      WHEN (p_to - p_from) <= 180 THEN 'week'
      ELSE 'month'
    END AS g
  )
  SELECT jsonb_build_object(
    'kpi', jsonb_build_object(
      'totalRevenue', (SELECT total_revenue FROM kpi_base),
      'totalProfit', (SELECT total_profit FROM kpi_base),
      'totalQty', (SELECT total_qty FROM kpi_base),
      'totalTransaksi', (SELECT total_transaksi FROM kpi_base),
      'totalCustomer', (SELECT total_customer FROM kpi_base),
      'aov', CASE
        WHEN (SELECT total_transaksi FROM kpi_base) > 0
          THEN ROUND((SELECT total_revenue FROM kpi_base) / (SELECT total_transaksi FROM kpi_base))
        ELSE 0
      END
    ),
    'quickInsight', jsonb_build_object(
      'produkTerlaris', (SELECT jsonb_build_object('kode', kode, 'nama', nama, 'value', value) FROM produk_terlaris),
      'produkProfitTertinggi', (SELECT jsonb_build_object('kode', kode, 'nama', nama, 'value', value) FROM produk_profit),
      'pasarTerbaik', (SELECT jsonb_build_object('location', location, 'value', value) FROM pasar_terbaik),
      'customerTerbaik', (SELECT jsonb_build_object('pelangganId', pelanggan_id, 'nama', nama, 'value', value) FROM customer_terbaik)
    ),
    'marketSummary', COALESCE((SELECT arr FROM market_summary_json), '[]'::jsonb),
    'trend', analytics_trend(p_from, p_to, p_location, p_kode, (SELECT g FROM gran))
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_overview(date, date, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek ketiga fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc
-- WHERE proname IN ('sales_flat', 'analytics_trend', 'analytics_overview');
--
-- Cek grant:
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name IN ('sales_flat', 'analytics_trend', 'analytics_overview');
--
-- Cek sales_flat meratakan items dengan benar (bandingkan manual dengan
-- beberapa baris sales asli):
-- SELECT * FROM public.sales_flat('2026-01-01', '2026-12-31') LIMIT 20;
--
-- Cek analytics_trend untuk 30 hari terakhir, semua market/produk, granularity harian:
-- SELECT jsonb_pretty(public.analytics_trend(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL, 'day'));
--
-- Cek analytics_overview untuk bulan berjalan:
-- SELECT jsonb_pretty(public.analytics_overview(date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE, NULL, NULL));
--
-- Cek totalTransaksi TIDAK ke-inflate oleh banyak item per transaksi
-- (bandingkan dengan COUNT manual atas tabel sales asli):
-- SELECT COUNT(*) FROM sales WHERE type = 'sale' AND date BETWEEN '2026-07-01' AND '2026-07-31';
-- SELECT (public.analytics_overview('2026-07-01','2026-07-31',NULL,NULL) -> 'kpi' ->> 'totalTransaksi');
-- (kedua angka di atas harus SAMA)
-- ────────────────────────────────────────────────────────────
