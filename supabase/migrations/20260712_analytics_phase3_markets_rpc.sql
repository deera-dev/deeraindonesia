-- ============================================================
-- Analytics (BI) — Phase 3: analytics_markets() + analytics_market_detail()
--
-- Lanjutan dari Phase 1 (sales_flat + analytics_trend + analytics_overview,
-- 20260712_analytics_phase1_rpc.sql) dan Phase 2 (analytics_products,
-- 20260712_analytics_phase2_products_rpc.sql). Scope migration ini HANYA 2
-- fungsi baru untuk tab Markets — mengikuti desain yang sudah disepakati di
-- ANALYTICS_ARCHITECTURE_PLAN.md §5.5-5.6. TIDAK ADA perubahan pada
-- sales_flat(), analytics_trend(), analytics_overview(), atau
-- analytics_products() yang sudah ada — analytics_market_detail() HANYA
-- MEMANGGIL analytics_trend() (komposisi, bukan modifikasi).
--
-- Filosofi SAMA seperti seluruh RPC Analytics sebelumnya: PostgreSQL =
-- seluruh business logic & agregasi, frontend HANYA memanggil RPC,
-- menerima hasil akhir, dan me-render lewat .map() murni.
--
-- ════════════════════════════════════════════════════════════
-- 1. analytics_markets(p_from, p_to, p_kode)
-- ════════════════════════════════════════════════════════════
--
-- RPC untuk ringkasan tab Markets (initial load — SELALU dipanggil begitu
-- tab dibuka, TIDAK lazy). Dibangun di atas sales_flat() (Phase 1) — tidak
-- menulis ulang logika unnest items/tanda retur.
--
-- CATATAN PENTING soal parameter: RPC ini SENGAJA TIDAK menerima
-- `p_location` — berbeda dari analytics_overview/analytics_trend/
-- analytics_products yang semuanya menerima p_location dari Global Filter.
-- Alasan: tab Markets ADALAH tampilan breakdown PER MARKET — kalau Global
-- Filter "Market" dipakai untuk mempersempit RPC ini juga, hasilnya cuma
-- akan menampilkan 1 baris (market yang difilter), bertentangan dengan
-- instruksi eksplisit "seluruh market selalu ditampilkan". Filter Market
-- di Global Filter Bar TETAP ada secara UI (dipakai tab lain), tapi
-- frontend SENGAJA TIDAK meneruskan `filter.location` ke RPC ini — hanya
-- `p_from`/`p_to`/`p_kode` yang diteruskan ("revenue/profit/qty mengikuti
-- filter global" HANYA berlaku untuk tanggal & produk, BUKAN market).
--
-- Return jsonb:
--   { markets: [{location, revenue, profit, qty, customer}, ...] }
--
-- Business rule:
--   - SELALU 3 baris (gudang/cideng/tegalgubug) — market TANPA transaksi
--     sama sekali pada rentang/filter tetap muncul dengan value 0, BUKAN
--     hilang dari list (LEFT JOIN dari daftar lokasi tetap, bukan hasil
--     GROUP BY langsung yang otomatis mengecualikan lokasi kosong). Daftar
--     3 lokasi di-hardcode SEBAGAI KONSTANTA DOMAIN (sama seperti kolom
--     gudang/cideng/tegalgubug yang sudah hardcoded di skema stok_warna,
--     dan LOCATIONS di packages/shared/lib/marketDay.js) — BUKAN
--     duplikasi logika bisnis, karena tidak ada logika di sini, murni
--     daftar nilai domain yang sudah tetap di seluruh codebase ini.
--   - revenue/profit/qty = SUM langsung dari sales_flat (retur sudah
--     bertanda negatif, tidak dikurangi lagi).
--   - customer = COUNT(DISTINCT pelanggan_id), NULL (walk-in) dikecualikan
--     — pola identik dengan totalCustomer di analytics_overview.
--   - Diurutkan `ORDER BY profit DESC` (market tanpa transaksi/profit 0
--     otomatis ke bawah, TIDAK di-exclude dari list).
--   - Baris dengan `location IS NULL` di sales (data lama/rusak) TIDAK
--     ikut dihitung ke market manapun — sama seperti marketSummary di
--     analytics_overview yang juga mensyaratkan `location IS NOT NULL`.
--
-- Edge case:
--   - Tidak ada transaksi sama sekali pada rentang/filter -> ketiga market
--     tetap muncul dengan revenue/profit/qty/customer = 0 (BUKAN array
--     kosong — beda dari RPC lain yang "tidak ada data" berarti `[]`,
--     tab Markets selalu punya struktur 3 baris tetap).
--
-- Idempotent, SECURITY INVOKER, dibangun di atas sales_flat() — tidak
-- menulis ulang logika unnest jsonb.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_markets(
  p_from date,
  p_to   date,
  p_kode text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH all_locations AS (
    -- Daftar domain tetap (lihat catatan di atas) — BUKAN hasil query,
    -- supaya market tanpa transaksi tetap muncul di output.
    SELECT unnest(ARRAY['gudang', 'cideng', 'tegalgubug']) AS location
  ),
  filtered AS (
    SELECT sf.*
    FROM sales_flat(p_from, p_to) sf
    WHERE (p_kode IS NULL OR sf.kode = p_kode)
      AND sf.location IS NOT NULL
  ),
  agg AS (
    SELECT
      location,
      SUM(revenue) AS revenue,
      SUM(profit)  AS profit,
      SUM(qty)     AS qty,
      COUNT(DISTINCT pelanggan_id) FILTER (WHERE pelanggan_id IS NOT NULL) AS customer
    FROM filtered
    GROUP BY location
  )
  SELECT jsonb_build_object(
    'markets', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'location', al.location,
          'revenue', COALESCE(a.revenue, 0),
          'profit', COALESCE(a.profit, 0),
          'qty', COALESCE(a.qty, 0),
          'customer', COALESCE(a.customer, 0)
        )
        ORDER BY COALESCE(a.profit, 0) DESC
      )
      FROM all_locations al
      LEFT JOIN agg a ON a.location = al.location),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_markets(date, date, text) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- 2. analytics_market_detail(p_market, p_from, p_to, p_kode)
-- ════════════════════════════════════════════════════════════
--
-- Dipanggil HANYA saat user klik/expand 1 market di tab Markets (LAZY —
-- BUKAN bagian initial load, TIDAK dipanggil bersamaan dengan
-- analytics_markets()). Frontend WAJIB menahan pemanggilan RPC ini sampai
-- ada interaksi eksplisit dari user (lihat catatan `enabled` di
-- queries.js) — lihat §PERFORMANCE di instruksi implementasi.
--
-- Return jsonb:
--   {
--     revenue, profit, qty, customer,
--     produkTerlaris: [{kode, value}, ...],   -- top 5 by qty, market ini saja
--     trend: { ...hasil analytics_trend() dengan p_location := p_market... }
--   }
--
-- Business rule:
--   - revenue/profit/qty/customer = SUM/COUNT(DISTINCT) dari sales_flat,
--     di-filter ke `location = p_market` SAJA (mengabaikan filter.location
--     Global Filter — market yang dipilih USER LEWAT KLIK/EXPAND adalah
--     satu-satunya location yang relevan di sini, bukan filter.location).
--     `p_kode` TETAP diteruskan (product filter Global Filter tetap
--     relevan untuk drill-down 1 market).
--   - produkTerlaris = top 5 kode dengan SUM(qty) terbesar DI MARKET INI
--     SAJA pada rentang/filter yang sama, HANYA kode dengan qty > 0 (pola
--     sama seperti leaderboard `terlaris` di analytics_products — mencegah
--     kode net-negatif akibat retur muncul sebagai "terlaris"). Bentuk
--     item SAMA dengan leaderboard Products: {kode, value} — TANPA nama,
--     konsisten dengan keputusan tab Products (frontend cukup kode).
--   - trend = hasil PEMANGGILAN LANGSUNG analytics_trend(p_from, p_to,
--     p_market, p_kode, granularity) — TIDAK ADA logika trend yang
--     ditulis ulang di sini. Granularity OTOMATIS mengikuti heuristik yang
--     SAMA PERSIS dengan analytics_overview (≤31 hari -> 'day', ≤180 hari
--     -> 'week', selebihnya -> 'month') — supaya perilaku "grafik tidak
--     berantakan untuk rentang panjang" konsisten di seluruh Analytics,
--     bukan aturan baru yang berbeda sendiri.
--
-- Edge case:
--   - `p_market` tidak match lokasi manapun (typo/NULL) -> `location =
--     p_market` tidak match apa pun -> seluruh field 0/kosong, `trend`
--     tetap terpanggil (analytics_trend juga mengembalikan buckets kosong
--     untuk filter yang tidak match) — BUKAN error, konsisten dengan pola
--     "filter tidak match = tidak ada data" di seluruh RPC Analytics lain.
--   - Tidak ada transaksi market ini pada rentang/filter -> revenue/
--     profit/qty/customer = 0, produkTerlaris = [], trend.buckets = [].
--
-- Idempotent, SECURITY INVOKER, dibangun di atas sales_flat() DAN
-- MEMANGGIL analytics_trend() — tidak menulis ulang logika trend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_market_detail(
  p_market text,
  p_from   date,
  p_to     date,
  p_kode   text
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
    WHERE sf.location = p_market
      AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  kpi_base AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS revenue,
      COALESCE(SUM(profit), 0)  AS profit,
      COALESCE(SUM(qty), 0)     AS qty,
      COUNT(DISTINCT pelanggan_id) FILTER (WHERE pelanggan_id IS NOT NULL) AS customer
    FROM filtered
  ),
  produk_terlaris AS (
    SELECT kode, SUM(qty) AS value
    FROM filtered
    WHERE kode IS NOT NULL
    GROUP BY kode
    HAVING SUM(qty) > 0
    ORDER BY value DESC
    LIMIT 5
  ),
  produk_terlaris_json AS (
    SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value) ORDER BY value DESC) AS arr
    FROM produk_terlaris
  ),
  gran AS (
    -- Heuristik granularity OTOMATIS sama persis dengan analytics_overview
    -- (lihat komentar di 20260712_analytics_phase1_rpc.sql §3).
    SELECT CASE
      WHEN (p_to - p_from) <= 31  THEN 'day'
      WHEN (p_to - p_from) <= 180 THEN 'week'
      ELSE 'month'
    END AS g
  )
  SELECT jsonb_build_object(
    'revenue', (SELECT revenue FROM kpi_base),
    'profit', (SELECT profit FROM kpi_base),
    'qty', (SELECT qty FROM kpi_base),
    'customer', (SELECT customer FROM kpi_base),
    'produkTerlaris', COALESCE((SELECT arr FROM produk_terlaris_json), '[]'::jsonb),
    'trend', analytics_trend(p_from, p_to, p_market, p_kode, (SELECT g FROM gran))
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_market_detail(text, date, date, text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek kedua fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc
-- WHERE proname IN ('analytics_markets', 'analytics_market_detail');
--
-- Cek grant:
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name IN ('analytics_markets', 'analytics_market_detail');
--
-- Cek analytics_markets SELALU mengembalikan 3 market walau tidak ada transaksi:
-- SELECT jsonb_pretty(public.analytics_markets('2020-01-01', '2020-01-02', NULL));
-- (harus tetap 3 baris, semua value 0)
--
-- Cek untuk 30 hari terakhir, semua produk:
-- SELECT jsonb_pretty(public.analytics_markets(CURRENT_DATE - 30, CURRENT_DATE, NULL));
--
-- Cek analytics_market_detail untuk 1 market:
-- SELECT jsonb_pretty(public.analytics_market_detail('cideng', CURRENT_DATE - 30, CURRENT_DATE, NULL));
--
-- Cek produkTerlaris di market_detail HANYA berisi kode yang benar-benar
-- terjual di market tsb (bandingkan manual):
-- SELECT kode, SUM(qty) FROM sales_flat(CURRENT_DATE - 30, CURRENT_DATE)
-- WHERE location = 'cideng' GROUP BY kode ORDER BY 2 DESC LIMIT 5;
-- ────────────────────────────────────────────────────────────
