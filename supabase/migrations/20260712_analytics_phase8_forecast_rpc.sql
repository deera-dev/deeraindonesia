-- ============================================================
-- Analytics (BI) — Phase 8: analytics_forecast()
--
-- Lanjutan dari Phase 1-7. Scope migration ini HANYA 1 fungsi baru:
-- analytics_forecast() untuk tab baru "Forecast" — Revenue/Profit/Sales
-- Forecast, Product Demand Forecast, Restock Forecast, Customer Forecast.
--
-- ════════════════════════════════════════════════════════════
-- METODE — WAJIB explainable, TANPA AI/ML (instruksi eksplisit roadmap)
-- ════════════════════════════════════════════════════════════
-- Setiap series diberi 3 angka forecast dari 3 metode sederhana yang bisa
-- dijelaskan ke siapa pun tanpa istilah machine learning:
--   1. Moving Average (MA)          — rata-rata N periode terakhir.
--   2. Weighted Moving Average (WMA) — rata-rata N periode terakhir,
--      periode LEBIH BARU diberi bobot LEBIH BESAR (bobot linear 1..N).
--   3. Simple Exponential Smoothing (ES) — level = alpha × nilai_terbaru +
--      (1-alpha) × level_sebelumnya, dihitung berulang dari AWAL histori.
--      Forecast periode berikutnya = level TERAKHIR (tidak ada komponen
--      tren/musiman — "simple", sesuai instruksi "metode sederhana").
-- KETIGANYA ditampilkan bersamaan (bukan cuma 1 angka "black box") supaya
-- Denny bisa lihat rentang estimasi & metode mana yang paling masuk akal
-- untuk pola datanya.
--
-- ════════════════════════════════════════════════════════════
-- REUSE — TIDAK menulis ulang logika bucketing/top-produk
-- ════════════════════════════════════════════════════════════
-- Histori Revenue/Profit/Qty DAN Top 5 Produk per periode diambil dengan
-- MEMANGGIL LANGSUNG `analytics_trend()` (Phase 1) — `buckets` dan
-- `topProductTrend` yang sudah dihitung di sana dipakai APA ADANYA sebagai
-- "data latih" forecast. TIDAK ADA logika unnest jsonb/bucketing yang
-- ditulis ulang. Granularity efektif (setelah fallback ke 'day' kalau
-- input tidak valid) juga diambil dari hasil `analytics_trend()`
-- (`t->>'granularity'`), BUKAN direplikasi ulang.
--
-- ════════════════════════════════════════════════════════════
-- ⚠️ KETERBATASAN DATA
-- ════════════════════════════════════════════════════════════
-- Forecast MEMBUTUHKAN minimal 2 titik histori (periode) untuk bermakna.
-- Kalau rentang filter terlalu pendek/granularity terlalu kasar sehingga
-- hanya ada 0-1 bucket histori, seluruh angka forecast (ma/wma/es) untuk
-- series tsb dikembalikan `null` — BUKAN 0 atau angka yang diekstrapolasi
-- paksa dari 1 titik data. FE WAJIB menampilkan "Data belum cukup" saat
-- null (pola sama persis `periodComparison.mom/yoy` di Phase 6).
--
-- Restock Forecast (seperti Suggested Restock di Phase 7) SENGAJA TIDAK
-- memakai `expected_stok` (baseline rekonsiliasi produksi, BUKAN target
-- restock — lihat migration Phase 7 untuk audit lengkap) — memakai
-- estimasi demand dari ES (metode paling responsif terhadap tren
-- terbaru) dikombinasikan dengan stok `stok_warna` saat ini.
--
-- ════════════════════════════════════════════════════════════
-- analytics_forecast(p_from, p_to, p_location, p_kode, p_granularity,
--                     p_alpha, p_lookback_periods, p_restock_horizon_periods)
-- ════════════════════════════════════════════════════════════
--
-- Parameter:
--   p_from/p_to    Rentang HISTORI yang dipakai sebagai "data latih" —
--                  SAMA seperti Global Filter aktif (rentang lebih panjang
--                  = histori lebih banyak = forecast lebih stabil).
--   p_granularity  'day'|'week'|'month'|'year', fallback 'day' (pola sama
--                  analytics_trend). Default pemanggilan FE: 'week' (siklus
--                  pasar mingguan lebih natural utk forecast retail ini).
--   p_alpha        Parameter smoothing ES, 0 < alpha <= 1 (default 0.3 —
--                  nilai umum dipakai, memberi bobot wajar ke data
--                  terbaru tanpa terlalu reaktif terhadap noise 1 periode).
--   p_lookback_periods  Berapa periode TERAKHIR dipakai utk MA/WMA (default
--                  8) — ES tetap memakai SELURUH histori yang tersedia
--                  (sifat alami exponential smoothing).
--   p_restock_horizon_periods  Berapa periode ke depan yang jadi target
--                  buffer restock (default 2).
--
-- Return jsonb:
--   {
--     meta: { granularity, historyBucketCount, alpha, lookbackPeriods, nextPeriodeLabel },
--     revenueForecast: { history:[{periode,value}], ma, wma, es } | dengan ma/wma/es null kalau data<2,
--     profitForecast:  { ...sama... },
--     salesForecast:   { ...sama..., "value" = qty },
--     customerForecast:{ ...sama..., "value" = jumlah customer unik per periode },
--     productDemandForecast: [{kode, nama, history:[...], ma, wma, es}, ...],  -- top 5 produk
--     restockForecast: [{kode, forecastedDemandNextPeriod, currentStock, suggestedOrderQty}, ...]
--   }
--
-- Idempotent, SECURITY INVOKER, dibangun di atas analytics_trend()
-- (Phase 1) + stok_warna (existing) — tidak menulis ulang logika lain.
--
-- ════════════════════════════════════════════════════════════
-- FIX (2026-07) — ERROR 42P20 "window function calls cannot be nested"
-- ════════════════════════════════════════════════════════════
-- Versi awal migration ini memakai pola:
--   MAX(ROW_NUMBER() OVER (PARTITION BY series_key ORDER BY periode))
--     OVER (PARTITION BY series_key) AS max_rn
-- PostgreSQL MENOLAK pola ini — window function (ROW_NUMBER() OVER(...))
-- tidak boleh jadi argumen window function lain (MAX(...) OVER(...)) dalam
-- SATU level SELECT yang sama, error code 42P20. CTE `all_series_ranked`
-- dipecah jadi 2 tahap (`all_series_rn` lalu `all_series_ranked`) supaya
-- `rn` sudah berupa KOLOM BIASA sebelum dibungkus MAX(...) OVER(...) —
-- lihat komentar di kedua CTE tsb untuk detail. Business logic, algoritma
-- forecast (MA/WMA/ES), urutan data, nama field response, dan struktur
-- jsonb TIDAK berubah sama sekali — murni perbaikan cara SQL ditulis agar
-- valid secara sintaks/semantik PostgreSQL. Diaudit ulang: pola nested
-- window function SEPERTI INI hanya muncul di SATU tempat di seluruh
-- migration ini (dan tidak ditemukan di migration Analytics lain).
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_forecast(
  p_from                      date,
  p_to                        date,
  p_location                  text,
  p_kode                      text,
  p_granularity               text    DEFAULT 'week',
  p_alpha                     numeric DEFAULT 0.3,
  p_lookback_periods          integer DEFAULT 8,
  p_restock_horizon_periods   integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH RECURSIVE trend_raw AS (
    SELECT analytics_trend(p_from, p_to, p_location, p_kode, p_granularity) AS t
  ),
  eff_gran AS (
    SELECT (t ->> 'granularity') AS g FROM trend_raw
  ),
  buckets_unnested AS (
    SELECT
      (b ->> 'periode')::date AS periode,
      COALESCE((b ->> 'revenue')::numeric, 0) AS revenue,
      COALESCE((b ->> 'profit')::numeric, 0) AS profit,
      COALESCE((b ->> 'qty')::numeric, 0) AS qty
    FROM trend_raw, jsonb_array_elements((t -> 'buckets')) AS b
  ),
  top_products_unnested AS (
    SELECT
      (tp ->> 'kode') AS kode,
      (tp ->> 'nama') AS nama,
      (pt ->> 'periode')::date AS periode,
      COALESCE((pt ->> 'qty')::numeric, 0) AS qty
    FROM trend_raw,
      jsonb_array_elements((t -> 'topProductTrend')) AS tp,
      jsonb_array_elements((tp -> 'points')) AS pt
  ),
  product_names AS (
    SELECT DISTINCT kode, nama FROM top_products_unnested
  ),
  customer_series AS (
    SELECT
      date_trunc((SELECT g FROM eff_gran), sf.tanggal)::date AS periode,
      COUNT(DISTINCT sf.pelanggan_id) FILTER (WHERE sf.pelanggan_id IS NOT NULL) AS customer_count
    FROM sales_flat(p_from, p_to) sf
    WHERE (p_location IS NULL OR sf.location = p_location)
      AND (p_kode IS NULL OR sf.kode = p_kode)
    GROUP BY periode
  ),
  -- ── Gabungkan seluruh series jadi 1 bentuk long-format (series_key, periode, value)
  --    supaya MA/WMA/ES cukup ditulis SATU KALI dan berlaku generik utk semua series
  --    (revenue/profit/qty/customer/per-produk) — bukan diduplikasi per series. ──
  all_series AS (
    SELECT 'revenue' AS series_key, periode, revenue AS value FROM buckets_unnested
    UNION ALL
    SELECT 'profit', periode, profit FROM buckets_unnested
    UNION ALL
    SELECT 'qty', periode, qty FROM buckets_unnested
    UNION ALL
    SELECT 'customer', periode, customer_count FROM customer_series
    UNION ALL
    SELECT 'product:' || kode, periode, qty FROM top_products_unnested
  ),
  all_series_rn AS (
    -- Langkah 1/2 (FIX 42P20 "window function calls cannot be nested"):
    -- hitung ROW_NUMBER()/COUNT(*) TERLEBIH DAHULU di CTE terpisah, sebagai
    -- kolom BIASA (bukan lagi ekspresi window function) — supaya CTE
    -- berikutnya bisa membungkus `rn` dengan MAX(...) OVER(...) tanpa
    -- melanggar aturan PostgreSQL: window function TIDAK BOLEH jadi
    -- argumen window function lain dalam SATU level SELECT yang sama
    -- (persis pola lama: `MAX(ROW_NUMBER() OVER(...)) OVER(...)`, yang
    -- ditolak parser PostgreSQL dgn error 42P20).
    SELECT
      series_key, periode, value,
      ROW_NUMBER() OVER (PARTITION BY series_key ORDER BY periode) AS rn,
      COUNT(*) OVER (PARTITION BY series_key) AS n
    FROM all_series
  ),
  all_series_ranked AS (
    -- Langkah 2/2: `rn` di sini SUDAH berupa kolom biasa hasil CTE
    -- `all_series_rn` (bukan window function call lagi) — MAX(rn)
    -- OVER(...) sekarang LEGAL karena argumennya kolom biasa, bukan nested
    -- window function. Nilai `max_rn` yang dihasilkan IDENTIK dengan versi
    -- lama (`MAX(ROW_NUMBER() OVER(...)) OVER(...)`) — hanya cara
    -- komputasinya dipecah jadi 2 tahap CTE, algoritma/business logic
    -- TIDAK berubah sama sekali.
    SELECT
      series_key, periode, value, rn, n,
      MAX(rn) OVER (PARTITION BY series_key) AS max_rn
    FROM all_series_rn
  ),
  -- ── Moving Average & Weighted Moving Average (window/aggregate murni, tidak butuh rekursi) ──
  ma_wma AS (
    SELECT
      series_key,
      AVG(value) FILTER (WHERE rn > max_rn - p_lookback_periods) AS ma,
      SUM(value * (rn - GREATEST(0, max_rn - p_lookback_periods))) FILTER (WHERE rn > max_rn - p_lookback_periods)
        / NULLIF(SUM(rn - GREATEST(0, max_rn - p_lookback_periods)) FILTER (WHERE rn > max_rn - p_lookback_periods), 0) AS wma
    FROM all_series_ranked
    GROUP BY series_key
  ),
  -- ── Simple Exponential Smoothing: level_t = alpha*x_t + (1-alpha)*level_(t-1),
  --    dihitung berulang dari titik histori PERTAMA — recursive CTE di-partisi
  --    per series_key via kondisi JOIN, jadi 1 rekursi berlaku utk SEMUA series
  --    sekaligus (revenue/profit/qty/customer/tiap produk), bukan ditulis N kali. ──
  es_calc AS (
    SELECT series_key, rn, value AS smoothed
    FROM all_series_ranked WHERE rn = 1
    UNION ALL
    SELECT b.series_key, b.rn, (p_alpha * b.value) + ((1 - p_alpha) * e.smoothed)
    FROM all_series_ranked b
    JOIN es_calc e ON e.series_key = b.series_key AND b.rn = e.rn + 1
  ),
  es_final AS (
    SELECT DISTINCT ON (series_key) series_key, smoothed AS es
    FROM es_calc
    ORDER BY series_key, rn DESC
  ),
  n_by_series AS (
    SELECT series_key, MAX(n) AS n FROM all_series_ranked GROUP BY series_key
  ),
  forecast_by_series AS (
    SELECT
      nb.series_key,
      nb.n,
      CASE WHEN nb.n >= 2 THEN mw.ma ELSE NULL END AS ma,
      CASE WHEN nb.n >= 2 THEN mw.wma ELSE NULL END AS wma,
      CASE WHEN nb.n >= 2 THEN ef.es ELSE NULL END AS es
    FROM n_by_series nb
    LEFT JOIN ma_wma mw ON mw.series_key = nb.series_key
    LEFT JOIN es_final ef ON ef.series_key = nb.series_key
  ),
  history_json AS (
    SELECT series_key, jsonb_agg(jsonb_build_object('periode', periode, 'value', value) ORDER BY periode) AS arr
    FROM all_series_ranked
    GROUP BY series_key
  ),
  next_periode AS (
    SELECT
      MAX(periode) + (CASE (SELECT g FROM eff_gran)
        WHEN 'day' THEN INTERVAL '1 day'
        WHEN 'week' THEN INTERVAL '7 day'
        WHEN 'month' THEN INTERVAL '1 month'
        WHEN 'year' THEN INTERVAL '1 year'
        ELSE INTERVAL '1 day' END) AS next_date
    FROM buckets_unnested
  ),
  stok_agg AS (
    -- Pola SAMA seperti stok_agg di analytics_products (Phase 2)/
    -- analytics_inventory (Phase 7) — primitif "jumlah stok sesuai lokasi",
    -- BUKAN business logic baru yang diduplikasi, hanya akses tabel dasar.
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
  )
  SELECT jsonb_build_object(
    'meta', jsonb_build_object(
      'granularity', (SELECT g FROM eff_gran),
      'historyBucketCount', (SELECT COUNT(*) FROM buckets_unnested),
      'alpha', p_alpha,
      'lookbackPeriods', p_lookback_periods,
      'nextPeriodeLabel', (SELECT next_date FROM next_periode)
    ),
    'revenueForecast', jsonb_build_object(
      'history', COALESCE((SELECT arr FROM history_json WHERE series_key = 'revenue'), '[]'::jsonb),
      'ma', (SELECT ma FROM forecast_by_series WHERE series_key = 'revenue'),
      'wma', (SELECT wma FROM forecast_by_series WHERE series_key = 'revenue'),
      'es', (SELECT es FROM forecast_by_series WHERE series_key = 'revenue')
    ),
    'profitForecast', jsonb_build_object(
      'history', COALESCE((SELECT arr FROM history_json WHERE series_key = 'profit'), '[]'::jsonb),
      'ma', (SELECT ma FROM forecast_by_series WHERE series_key = 'profit'),
      'wma', (SELECT wma FROM forecast_by_series WHERE series_key = 'profit'),
      'es', (SELECT es FROM forecast_by_series WHERE series_key = 'profit')
    ),
    'salesForecast', jsonb_build_object(
      'history', COALESCE((SELECT arr FROM history_json WHERE series_key = 'qty'), '[]'::jsonb),
      'ma', (SELECT ma FROM forecast_by_series WHERE series_key = 'qty'),
      'wma', (SELECT wma FROM forecast_by_series WHERE series_key = 'qty'),
      'es', (SELECT es FROM forecast_by_series WHERE series_key = 'qty')
    ),
    'customerForecast', jsonb_build_object(
      'history', COALESCE((SELECT arr FROM history_json WHERE series_key = 'customer'), '[]'::jsonb),
      'ma', (SELECT ma FROM forecast_by_series WHERE series_key = 'customer'),
      'wma', (SELECT wma FROM forecast_by_series WHERE series_key = 'customer'),
      'es', (SELECT es FROM forecast_by_series WHERE series_key = 'customer')
    ),
    'productDemandForecast', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kode', pn.kode,
        'nama', pn.nama,
        'history', COALESCE((SELECT arr FROM history_json WHERE series_key = 'product:' || pn.kode), '[]'::jsonb),
        'ma', fs.ma,
        'wma', fs.wma,
        'es', fs.es
      ) ORDER BY pn.kode)
      FROM product_names pn
      LEFT JOIN forecast_by_series fs ON fs.series_key = 'product:' || pn.kode
    ), '[]'::jsonb),
    'restockForecast', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kode', pn.kode,
        'forecastedDemandNextPeriod', ROUND(GREATEST(0, COALESCE(fs.es, 0))),
        'currentStock', COALESCE(sa.total_stok, 0),
        'suggestedOrderQty', GREATEST(0, ROUND(COALESCE(fs.es, 0) * p_restock_horizon_periods - COALESCE(sa.total_stok, 0)))
      ) ORDER BY pn.kode)
      FROM product_names pn
      LEFT JOIN forecast_by_series fs ON fs.series_key = 'product:' || pn.kode
      LEFT JOIN stok_agg sa ON sa.kode = pn.kode
      WHERE fs.es IS NOT NULL
    ), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_forecast(date, date, text, text, text, numeric, integer, integer) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- SELECT proname FROM pg_proc WHERE proname = 'analytics_forecast';
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'analytics_forecast';
--
-- Cek 12 minggu terakhir, semua market/produk, default:
-- SELECT jsonb_pretty(public.analytics_forecast(CURRENT_DATE - 84, CURRENT_DATE, NULL, NULL, 'week', 0.3, 8, 2));
--
-- Cek forecast null kalau histori < 2 periode (rentang sangat pendek):
-- SELECT jsonb_pretty(public.analytics_forecast(CURRENT_DATE - 1, CURRENT_DATE, NULL, NULL, 'week', 0.3, 8, 2));
-- ────────────────────────────────────────────────────────────
