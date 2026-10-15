-- ============================================================
-- Analytics (BI) — Phase 6 EXTENSION: analytics_advanced() (additive)
--
-- Denny meminta Phase 6 lama (RPC analytics_advanced() dari
-- 20260712_analytics_phase6_advanced_rpc.sql) DIPERLUAS, BUKAN ditulis
-- ulang: ABC Classification, Revenue Concentration, Customer
-- Concentration, Market Concentration, Margin Risk (produk margin
-- negatif/rendah), Sales Distribution (weekday vs weekend), dan Trend
-- Comparison WoW (melengkapi MoM/YoY yang sudah ada).
--
-- ATURAN KETAT dari Denny — WAJIB dipatuhi migration ini:
--   "JANGAN mengubah business rule yang sudah ada"
--   "JANGAN mengubah struktur data yang sudah dipakai tab lain"
--   "Semua implementasi baru harus bersifat additive"
--   "Semua metric lama tetap berjalan"
--
-- CARA MEMATUHI (dibaca sebelum konsumsi FE):
--   1. SELURUH field lama (kpi, growth, contribution, productMix, pareto,
--      newVsReturning, weekdayPerformance, hourlyPerformance,
--      periodComparison.mom, periodComparison.yoy) DIPERTAHANKAN 100% SAMA
--      — nilai/CTE-nya TIDAK disentuh, hanya di-copy verbatim dari migration
--      Phase 6 asli ke bawah ini (Postgres CREATE OR REPLACE FUNCTION
--      menggantikan SELURUH body function, jadi body lama HARUS disalin
--      utuh, bukan di-patch parsial).
--   2. Field BARU ditambahkan sebagai SIBLING KEY baru di jsonb_build_object
--      teratas (abcClassification, revenueConcentration,
--      customerConcentration, marketConcentration, marginRisk,
--      salesDistribution) atau sebagai key baru DI DALAM object yang sudah
--      ada (periodComparison.wow ditambah di samping mom/yoy yang tetap
--      ada) — TIDAK ADA field lama yang di-rename/dihapus/diubah tipenya.
--   3. Parameter FUNGSI BARU (p_low_margin_threshold) ditambah di AKHIR
--      daftar parameter DENGAN DEFAULT VALUE — pemanggilan lama dari FE
--      (4 parameter: p_from, p_to, p_location, p_kode) TETAP VALID tanpa
--      perubahan kode, Postgres otomatis pakai default.
--   4. Reuse CTE existing SEBANYAK MUNGKIN — abcClassification &
--      revenueConcentration REUSE `pareto_final`/`pareto_total` (TIDAK
--      menulis ulang logika cumulative sum), customerConcentration REUSE
--      `customer_period` (CTE yang sama yang sudah dipakai newVsReturning),
--      salesDistribution REUSE `weekday_final` (CTE yang sama yang sudah
--      dipakai weekdayPerformance). HANYA marketConcentration, marginRisk,
--      dan wow_* yang benar-benar CTE baru (karena memang belum ada CTE
--      yang menghitung agregasi per-lokasi atau per-produk-margin di RPC
--      ini sebelumnya).
--
-- ════════════════════════════════════════════════════════════
-- Field BARU yang ditambahkan (lihat migration Phase 6 asli untuk field
-- lama yang TIDAK berubah):
-- ════════════════════════════════════════════════════════════
--
--   abcClassification: {
--     thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
--     a: { count, revenuePct }, b: { count, revenuePct }, c: { count, revenuePct }
--   }
--   -- Klasifikasi ABC standar berbasis cumulative % revenue (REUSE
--   -- pareto_final.cumulative_pct apa adanya): A = produk yang bersama-sama
--   -- menyumbang 0-80% revenue (produk paling penting), B = 80-95%,
--   -- C = 95-100% (ekor panjang). Threshold 80/95 adalah KONVENSI ABC
--   -- ANALYSIS STANDAR (bukan angka yang dikarang), dikembalikan eksplisit
--   -- di field `thresholds` supaya FE tidak perlu menghardcode ulang.
--
--   revenueConcentration: { top5Pct, top10Pct }
--   -- % kontribusi revenue dari 5/10 produk teratas terhadap total revenue
--   -- portfolio — REUSE pareto_final (filter rn<=5 / rn<=10) + pareto_total.
--
--   customerConcentration: { top5Pct, top5CustomerCount, totalIdentifiedCustomers }
--   -- % kontribusi revenue dari 5 pelanggan (bernama, BUKAN walk-in)
--   -- teratas terhadap TOTAL REVENUE PORTFOLIO (kpi_base.total_revenue,
--   -- BUKAN cuma total revenue pelanggan bernama — supaya definisi
--   -- "concentration" konsisten dengan revenueConcentration di atas,
--   -- termasuk implikasi bahwa revenue walk-in otomatis mengurangi %
--   -- ini). REUSE customer_period (CTE yang sama dipakai newVsReturning).
--
--   marketConcentration: [{location, value, pct}, ...]
--   -- % kontribusi revenue per lokasi (gudang/cideng/tegalgubug) terhadap
--   -- total revenue portfolio, dalam rentang+filter yang SAMA dengan
--   -- `filtered` CTE (BEDA dari analytics_markets() Phase 3 yang SENGAJA
--   -- mengabaikan p_location — di sini justru MENGHORMATI p_location/p_kode
--   -- karena ini bagian dari analisis "Advanced" yang sudah terikat filter
--   -- aktif, bukan breakdown pasar independen).
--
--   marginRisk: {
--     lowMarginThresholdPct: <p_low_margin_threshold * 100>,
--     negativeMarginProducts: [{kode, revenue, marginPct}, ...],  -- LIMIT 10, margin < 0, ORDER BY marginPct ASC
--     lowMarginProducts:      [{kode, revenue, marginPct}, ...]   -- LIMIT 10, 0 <= margin < threshold, ORDER BY marginPct ASC
--   }
--   -- BEDA dari marginTertinggi/marginTerendah di analytics_products()
--   -- (Phase 2, per-produk margin TERTINGGI/TERENDAH secara umum) — di
--   -- sini fokus KHUSUS ke produk BERISIKO (margin negatif = jual rugi,
--   -- margin rendah = di bawah threshold yang bisa disesuaikan). Threshold
--   -- dikirim sebagai PARAMETER (p_low_margin_threshold, default 0.10 =
--   -- 10%) — bukan hardcode, pola sama seperti LOW_STOCK_COVER_DAYS dkk.
--
--   salesDistribution: {
--     weekday: {revenue, profit, qty, transaksi},  -- Senin-Jumat (dow 1-5)
--     weekend: {revenue, profit, qty, transaksi}   -- Sabtu-Minggu (dow 6-7)
--   }
--   -- REUSE weekday_final (CTE yang sama persis dipakai weekdayPerformance
--   -- di atas) — HANYA re-agregasi 7 baris yang SUDAH dihitung jadi 2
--   -- kelompok, TIDAK ADA query/logic baru ke tabel sumber.
--
--   periodComparison.wow: {currentRevenue, previousRevenue, pctChange} | null
--   -- Minggu KALENDER PENUH terakhir (Senin-Minggu, via date_trunc('week',
--   -- ...) yang di Postgres default mulai Senin) vs minggu sebelumnya —
--   -- POLA SAMA PERSIS dengan mom/yoy (relatif ke CURRENT_DATE, TIDAK
--   -- mengikuti p_from/p_to, null kalau histori < 2 minggu penuh).
--
-- ════════════════════════════════════════════════════════════
-- ⚠️ TIDAK diimplementasikan (jangan mengarang, lihat laporan Phase 6+9)
-- ════════════════════════════════════════════════════════════
-- "Executive Metrics" (poin 12 roadmap Phase 6) SENGAJA TIDAK dibuatkan
-- field catch-all baru — tidak ada definisi konkret metric apa yang
-- dimaksud selain yang sudah tercakup kpi/concentration/margin di atas.
-- Metric executive-level yang sungguh dibutuhkan (Revenue/Profit/Growth/
-- Customer/Transaction) SUDAH tersedia lengkap di analytics_overview()
-- (Phase 1) — Phase 9 (Executive Dashboard) mengambil langsung dari sana,
-- BUKAN duplikasi di sini.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_advanced(
  p_from                   date,
  p_to                     date,
  p_location               text,
  p_kode                   text,
  p_low_margin_threshold   numeric DEFAULT 0.10
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
      COALESCE(SUM(qty) FILTER (WHERE type = 'sale'), 0)  AS gross_sale_qty,
      COALESCE(SUM(qty) FILTER (WHERE type = 'retur'), 0) AS gross_retur_qty,
      COALESCE(SUM(revenue) FILTER (WHERE type = 'retur'), 0) AS retur_revenue,
      COUNT(DISTINCT sale_id) FILTER (WHERE type = 'sale') AS total_transaksi_sale
    FROM filtered
  ),
  item_diversity AS (
    SELECT sale_id, COUNT(DISTINCT kode) AS n_kode
    FROM filtered
    WHERE type = 'sale'
    GROUP BY sale_id
  ),
  prev_range AS (
    SELECT (p_from - (p_to - p_from + 1)) AS prev_from, (p_from - 1) AS prev_to
  ),
  previous_filtered AS (
    SELECT sf.*
    FROM sales_flat((SELECT prev_from FROM prev_range), (SELECT prev_to FROM prev_range)) sf
    WHERE (p_location IS NULL OR sf.location = p_location)
      AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  cur_by_kode AS (
    SELECT kode, SUM(revenue) AS revenue FROM filtered GROUP BY kode
  ),
  prev_by_kode AS (
    SELECT kode, SUM(revenue) AS revenue FROM previous_filtered GROUP BY kode
  ),
  growth_joined AS (
    SELECT
      COALESCE(c.kode, pr.kode) AS kode,
      COALESCE(c.revenue, 0) AS current_revenue,
      COALESCE(pr.revenue, 0) AS previous_revenue
    FROM cur_by_kode c
    FULL OUTER JOIN prev_by_kode pr ON pr.kode = c.kode
  ),
  growth_calc AS (
    SELECT kode, current_revenue, previous_revenue,
      ROUND(((current_revenue - previous_revenue) / previous_revenue) * 100, 1) AS growth_pct
    FROM growth_joined
    WHERE previous_revenue > 0
  ),
  top_growth AS (
    SELECT * FROM growth_calc ORDER BY growth_pct DESC LIMIT 5
  ),
  top_declining AS (
    SELECT * FROM growth_calc ORDER BY growth_pct ASC LIMIT 5
  ),
  contrib_product AS (
    SELECT kode, SUM(revenue) AS revenue, SUM(profit) AS profit FROM filtered GROUP BY kode
  ),
  revenue_contrib AS (
    SELECT kode, revenue AS value,
      CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND(revenue / (SELECT total_revenue FROM kpi_base) * 100, 1) ELSE 0 END AS pct
    FROM contrib_product WHERE revenue > 0 ORDER BY revenue DESC LIMIT 10
  ),
  profit_contrib AS (
    SELECT kode, profit AS value,
      CASE WHEN (SELECT total_profit FROM kpi_base) > 0
        THEN ROUND(profit / (SELECT total_profit FROM kpi_base) * 100, 1) ELSE 0 END AS pct
    FROM contrib_product WHERE profit > 0 ORDER BY profit DESC LIMIT 10
  ),
  mix_base AS (
    SELECT COALESCE(p.bahan, 'Lainnya') AS bahan, SUM(f.revenue) AS revenue
    FROM filtered f
    LEFT JOIN products p ON p.kode = f.kode
    GROUP BY COALESCE(p.bahan, 'Lainnya')
  ),
  product_mix AS (
    SELECT bahan, revenue AS value,
      CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND(revenue / (SELECT total_revenue FROM kpi_base) * 100, 1) ELSE 0 END AS pct
    FROM mix_base WHERE revenue > 0 ORDER BY revenue DESC
  ),
  pareto_base AS (
    SELECT kode, SUM(revenue) AS revenue FROM filtered GROUP BY kode HAVING SUM(revenue) > 0
  ),
  pareto_total AS (
    SELECT COALESCE(SUM(revenue), 0) AS total, COUNT(*) AS n FROM pareto_base
  ),
  pareto_ranked AS (
    SELECT kode, revenue,
      SUM(revenue) OVER (ORDER BY revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_sum,
      ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rn
    FROM pareto_base
  ),
  pareto_final AS (
    SELECT kode, revenue,
      CASE WHEN (SELECT total FROM pareto_total) > 0
        THEN ROUND(running_sum / (SELECT total FROM pareto_total) * 100, 1) ELSE 0 END AS cumulative_pct,
      rn
    FROM pareto_ranked
  ),
  pareto_count80 AS (
    SELECT MIN(rn) AS n FROM pareto_final WHERE cumulative_pct >= 80
  ),
  first_seen AS (
    SELECT sf2.pelanggan_id, MIN(sf2.tanggal) AS first_date
    FROM sales_flat('1900-01-01'::date, '9999-12-31'::date) sf2
    WHERE sf2.pelanggan_id IS NOT NULL
      AND (p_location IS NULL OR sf2.location = p_location)
      AND (p_kode IS NULL OR sf2.kode = p_kode)
    GROUP BY sf2.pelanggan_id
  ),
  customer_period AS (
    SELECT pelanggan_id, SUM(revenue) AS revenue
    FROM filtered
    WHERE pelanggan_id IS NOT NULL
    GROUP BY pelanggan_id
  ),
  customer_classified AS (
    SELECT cp.pelanggan_id, cp.revenue,
      CASE WHEN fs.first_date BETWEEN p_from AND p_to THEN 'new' ELSE 'returning' END AS bucket
    FROM customer_period cp
    JOIN first_seen fs ON fs.pelanggan_id = cp.pelanggan_id
  ),
  new_vs_returning_agg AS (
    SELECT
      COALESCE(SUM(revenue) FILTER (WHERE bucket = 'new'), 0) AS new_revenue,
      COALESCE(SUM(revenue) FILTER (WHERE bucket = 'returning'), 0) AS returning_revenue,
      COUNT(*) FILTER (WHERE bucket = 'new') AS new_count,
      COUNT(*) FILTER (WHERE bucket = 'returning') AS returning_count
    FROM customer_classified
  ),
  anonymous_agg AS (
    SELECT COALESCE(SUM(revenue), 0) AS anonymous_revenue
    FROM filtered WHERE pelanggan_id IS NULL
  ),
  weekday_agg AS (
    SELECT EXTRACT(ISODOW FROM tanggal)::int AS dow,
      SUM(revenue) AS revenue, SUM(profit) AS profit, SUM(qty) AS qty,
      COUNT(DISTINCT sale_id) FILTER (WHERE type = 'sale') AS transaksi
    FROM filtered
    GROUP BY dow
  ),
  weekday_final AS (
    SELECT d.dow,
      CASE d.dow
        WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
        WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' ELSE 'Minggu'
      END AS label,
      COALESCE(w.revenue, 0) AS revenue, COALESCE(w.profit, 0) AS profit,
      COALESCE(w.qty, 0) AS qty, COALESCE(w.transaksi, 0) AS transaksi
    FROM generate_series(1, 7) AS d(dow)
    LEFT JOIN weekday_agg w ON w.dow = d.dow
  ),
  hourly_agg AS (
    SELECT EXTRACT(HOUR FROM (s.created_at AT TIME ZONE 'Asia/Jakarta'))::int AS hour,
      SUM(f.revenue) AS revenue, SUM(f.profit) AS profit, SUM(f.qty) AS qty,
      COUNT(DISTINCT f.sale_id) FILTER (WHERE f.type = 'sale') AS transaksi
    FROM filtered f
    JOIN sales s ON s.id = f.sale_id
    WHERE s.created_at IS NOT NULL
    GROUP BY hour
  ),
  hourly_final AS (
    SELECT d.hour,
      COALESCE(h.revenue, 0) AS revenue, COALESCE(h.profit, 0) AS profit,
      COALESCE(h.qty, 0) AS qty, COALESCE(h.transaksi, 0) AS transaksi
    FROM generate_series(0, 23) AS d(hour)
    LEFT JOIN hourly_agg h ON h.hour = d.hour
  ),
  mom_bounds AS (
    SELECT
      (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date AS cur_start,
      (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date AS cur_end,
      (date_trunc('month', CURRENT_DATE) - INTERVAL '2 month')::date AS prev_start,
      (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' - INTERVAL '1 day')::date AS prev_end
  ),
  mom_current AS (
    SELECT COALESCE(SUM(sf.revenue), 0) AS revenue
    FROM sales_flat((SELECT cur_start FROM mom_bounds), (SELECT cur_end FROM mom_bounds)) sf
    WHERE (p_location IS NULL OR sf.location = p_location) AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  mom_previous AS (
    SELECT COALESCE(SUM(sf.revenue), 0) AS revenue
    FROM sales_flat((SELECT prev_start FROM mom_bounds), (SELECT prev_end FROM mom_bounds)) sf
    WHERE (p_location IS NULL OR sf.location = p_location) AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  mom_has_data AS (
    SELECT ((SELECT revenue FROM mom_current) <> 0 OR (SELECT revenue FROM mom_previous) <> 0) AS has_data
  ),
  yoy_bounds AS (
    SELECT
      (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')::date AS cur_start,
      (date_trunc('year', CURRENT_DATE) - INTERVAL '1 day')::date AS cur_end,
      (date_trunc('year', CURRENT_DATE) - INTERVAL '2 year')::date AS prev_start,
      (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year' - INTERVAL '1 day')::date AS prev_end
  ),
  yoy_current AS (
    SELECT COALESCE(SUM(sf.revenue), 0) AS revenue
    FROM sales_flat((SELECT cur_start FROM yoy_bounds), (SELECT cur_end FROM yoy_bounds)) sf
    WHERE (p_location IS NULL OR sf.location = p_location) AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  yoy_previous AS (
    SELECT COALESCE(SUM(sf.revenue), 0) AS revenue
    FROM sales_flat((SELECT prev_start FROM yoy_bounds), (SELECT prev_end FROM yoy_bounds)) sf
    WHERE (p_location IS NULL OR sf.location = p_location) AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  yoy_has_data AS (
    SELECT ((SELECT revenue FROM yoy_current) <> 0 OR (SELECT revenue FROM yoy_previous) <> 0) AS has_data
  ),

  -- ── BARU (Phase 6 Extension) ─────────────────────────────────────────
  -- ABC Classification — REUSE pareto_final.cumulative_pct apa adanya.
  abc_calc AS (
    SELECT
      CASE
        WHEN cumulative_pct <= 80 THEN 'a'
        WHEN cumulative_pct <= 95 THEN 'b'
        ELSE 'c'
      END AS klass,
      revenue
    FROM pareto_final
  ),
  abc_agg AS (
    SELECT klass, COUNT(*) AS n, COALESCE(SUM(revenue), 0) AS revenue
    FROM abc_calc
    GROUP BY klass
  ),

  -- Revenue Concentration — REUSE pareto_final/pareto_total (filter rn).
  revenue_concentration_calc AS (
    SELECT
      COALESCE(SUM(revenue) FILTER (WHERE rn <= 5), 0) AS top5_revenue,
      COALESCE(SUM(revenue) FILTER (WHERE rn <= 10), 0) AS top10_revenue
    FROM pareto_final
  ),

  -- Customer Concentration — REUSE customer_period (CTE yang sama dipakai
  -- newVsReturning di atas).
  customer_ranked AS (
    SELECT pelanggan_id, revenue,
      ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rn
    FROM customer_period
  ),
  customer_concentration_calc AS (
    SELECT
      COALESCE(SUM(revenue) FILTER (WHERE rn <= 5), 0) AS top5_revenue,
      COUNT(*) FILTER (WHERE rn <= 5) AS top5_count,
      COUNT(*) AS total_identified
    FROM customer_ranked
  ),

  -- Market Concentration — CTE baru, agregasi per lokasi dari `filtered`
  -- (menghormati p_location/p_kode aktif, BEDA dari analytics_markets()
  -- Phase 3 yang sengaja mengabaikan p_location — lihat catatan header).
  market_agg AS (
    SELECT location, SUM(revenue) AS revenue
    FROM filtered
    GROUP BY location
  ),
  market_concentration_calc AS (
    SELECT location, revenue AS value,
      CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND(revenue / (SELECT total_revenue FROM kpi_base) * 100, 1) ELSE 0 END AS pct
    FROM market_agg WHERE revenue > 0 ORDER BY revenue DESC
  ),

  -- Margin Risk — CTE baru, margin per produk (revenue+profit dari
  -- `contrib_product` yang SUDAH DIHITUNG di atas untuk contribution —
  -- REUSE, bukan agregasi ulang dari `filtered`).
  margin_calc AS (
    SELECT kode, revenue, profit,
      CASE WHEN revenue > 0 THEN ROUND(profit / revenue, 4) ELSE NULL END AS margin_pct
    FROM contrib_product
    WHERE revenue > 0
  ),
  margin_negative AS (
    SELECT kode, revenue, margin_pct FROM margin_calc
    WHERE margin_pct IS NOT NULL AND margin_pct < 0
    ORDER BY margin_pct ASC LIMIT 10
  ),
  margin_low AS (
    SELECT kode, revenue, margin_pct FROM margin_calc
    WHERE margin_pct IS NOT NULL AND margin_pct >= 0 AND margin_pct < p_low_margin_threshold
    ORDER BY margin_pct ASC LIMIT 10
  ),

  -- Sales Distribution (weekday vs weekend) — REUSE weekday_final (CTE
  -- yang sama dipakai weekdayPerformance di atas), murni re-agregasi 7
  -- baris yang sudah dihitung.
  sales_distribution_calc AS (
    SELECT
      COALESCE(SUM(revenue) FILTER (WHERE dow BETWEEN 1 AND 5), 0) AS weekday_revenue,
      COALESCE(SUM(profit) FILTER (WHERE dow BETWEEN 1 AND 5), 0) AS weekday_profit,
      COALESCE(SUM(qty) FILTER (WHERE dow BETWEEN 1 AND 5), 0) AS weekday_qty,
      COALESCE(SUM(transaksi) FILTER (WHERE dow BETWEEN 1 AND 5), 0) AS weekday_transaksi,
      COALESCE(SUM(revenue) FILTER (WHERE dow IN (6, 7)), 0) AS weekend_revenue,
      COALESCE(SUM(profit) FILTER (WHERE dow IN (6, 7)), 0) AS weekend_profit,
      COALESCE(SUM(qty) FILTER (WHERE dow IN (6, 7)), 0) AS weekend_qty,
      COALESCE(SUM(transaksi) FILTER (WHERE dow IN (6, 7)), 0) AS weekend_transaksi
    FROM weekday_final
  ),

  -- Trend Comparison WoW — pola SAMA PERSIS dengan mom_*/yoy_* di atas,
  -- HANYA beda satuan periode (minggu, bukan bulan/tahun). date_trunc('week',
  -- ...) di Postgres default mulai SENIN (ISO week).
  wow_bounds AS (
    SELECT
      (date_trunc('week', CURRENT_DATE) - INTERVAL '1 week')::date AS cur_start,
      (date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date AS cur_end,
      (date_trunc('week', CURRENT_DATE) - INTERVAL '2 week')::date AS prev_start,
      (date_trunc('week', CURRENT_DATE) - INTERVAL '1 week' - INTERVAL '1 day')::date AS prev_end
  ),
  wow_current AS (
    SELECT COALESCE(SUM(sf.revenue), 0) AS revenue
    FROM sales_flat((SELECT cur_start FROM wow_bounds), (SELECT cur_end FROM wow_bounds)) sf
    WHERE (p_location IS NULL OR sf.location = p_location) AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  wow_previous AS (
    SELECT COALESCE(SUM(sf.revenue), 0) AS revenue
    FROM sales_flat((SELECT prev_start FROM wow_bounds), (SELECT prev_end FROM wow_bounds)) sf
    WHERE (p_location IS NULL OR sf.location = p_location) AND (p_kode IS NULL OR sf.kode = p_kode)
  ),
  wow_has_data AS (
    SELECT ((SELECT revenue FROM wow_current) <> 0 OR (SELECT revenue FROM wow_previous) <> 0) AS has_data
  )

  SELECT jsonb_build_object(
    'kpi', jsonb_build_object(
      'returnRate', CASE WHEN (SELECT gross_sale_qty FROM kpi_base) > 0
        THEN ROUND(ABS((SELECT gross_retur_qty FROM kpi_base)) / (SELECT gross_sale_qty FROM kpi_base), 4)
        ELSE 0 END,
      'returnRevenueImpact', ABS((SELECT retur_revenue FROM kpi_base)),
      'overallMarginPct', CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND((SELECT total_profit FROM kpi_base) / (SELECT total_revenue FROM kpi_base), 4)
        ELSE 0 END,
      'avgBasketSize', CASE WHEN (SELECT total_transaksi_sale FROM kpi_base) > 0
        THEN ROUND((SELECT gross_sale_qty FROM kpi_base) / (SELECT total_transaksi_sale FROM kpi_base), 2)
        ELSE 0 END,
      'avgItemPerTransaksi', COALESCE((SELECT ROUND(AVG(n_kode), 2) FROM item_diversity), 0)
    ),
    'growth', jsonb_build_object(
      'topGrowth', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'kode', kode, 'currentRevenue', current_revenue, 'previousRevenue', previous_revenue, 'growthPct', growth_pct
      )) FROM top_growth), '[]'::jsonb),
      'topDeclining', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'kode', kode, 'currentRevenue', current_revenue, 'previousRevenue', previous_revenue, 'growthPct', growth_pct
      )) FROM top_declining), '[]'::jsonb)
    ),
    'contribution', jsonb_build_object(
      'revenueByProduct', COALESCE((SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value, 'pct', pct)) FROM revenue_contrib), '[]'::jsonb),
      'profitByProduct', COALESCE((SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', value, 'pct', pct)) FROM profit_contrib), '[]'::jsonb)
    ),
    'productMix', COALESCE((SELECT jsonb_agg(jsonb_build_object('bahan', bahan, 'value', value, 'pct', pct)) FROM product_mix), '[]'::jsonb),
    'pareto', jsonb_build_object(
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('kode', kode, 'value', revenue, 'cumulativePct', cumulative_pct)) FROM (SELECT * FROM pareto_final ORDER BY rn LIMIT 50) lim), '[]'::jsonb),
      'productsFor80Pct', COALESCE((SELECT n FROM pareto_count80), (SELECT n FROM pareto_total)),
      'totalProducts', (SELECT n FROM pareto_total)
    ),
    'newVsReturning', jsonb_build_object(
      'newRevenue', (SELECT new_revenue FROM new_vs_returning_agg),
      'returningRevenue', (SELECT returning_revenue FROM new_vs_returning_agg),
      'anonymousRevenue', (SELECT anonymous_revenue FROM anonymous_agg),
      'newCustomerCount', (SELECT new_count FROM new_vs_returning_agg),
      'returningCustomerCount', (SELECT returning_count FROM new_vs_returning_agg)
    ),
    'weekdayPerformance', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'dow', dow, 'label', label, 'revenue', revenue, 'profit', profit, 'qty', qty, 'transaksi', transaksi
    ) ORDER BY dow) FROM weekday_final), '[]'::jsonb),
    'hourlyPerformance', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'hour', hour, 'revenue', revenue, 'profit', profit, 'qty', qty, 'transaksi', transaksi
    ) ORDER BY hour) FROM hourly_final), '[]'::jsonb),
    'periodComparison', jsonb_build_object(
      'mom', CASE WHEN (SELECT has_data FROM mom_has_data) THEN jsonb_build_object(
          'currentRevenue', (SELECT revenue FROM mom_current),
          'previousRevenue', (SELECT revenue FROM mom_previous),
          'pctChange', CASE WHEN (SELECT revenue FROM mom_previous) > 0
            THEN ROUND(((SELECT revenue FROM mom_current) - (SELECT revenue FROM mom_previous)) / (SELECT revenue FROM mom_previous) * 100, 1)
            ELSE NULL END
        ) ELSE NULL END,
      'yoy', CASE WHEN (SELECT has_data FROM yoy_has_data) THEN jsonb_build_object(
          'currentRevenue', (SELECT revenue FROM yoy_current),
          'previousRevenue', (SELECT revenue FROM yoy_previous),
          'pctChange', CASE WHEN (SELECT revenue FROM yoy_previous) > 0
            THEN ROUND(((SELECT revenue FROM yoy_current) - (SELECT revenue FROM yoy_previous)) / (SELECT revenue FROM yoy_previous) * 100, 1)
            ELSE NULL END
        ) ELSE NULL END,
      'wow', CASE WHEN (SELECT has_data FROM wow_has_data) THEN jsonb_build_object(
          'currentRevenue', (SELECT revenue FROM wow_current),
          'previousRevenue', (SELECT revenue FROM wow_previous),
          'pctChange', CASE WHEN (SELECT revenue FROM wow_previous) > 0
            THEN ROUND(((SELECT revenue FROM wow_current) - (SELECT revenue FROM wow_previous)) / (SELECT revenue FROM wow_previous) * 100, 1)
            ELSE NULL END
        ) ELSE NULL END
    ),

    -- ── BARU (Phase 6 Extension, additive — field lama di atas TIDAK berubah) ──
    'abcClassification', jsonb_build_object(
      'thresholds', jsonb_build_object('aMaxCumulativePct', 80, 'bMaxCumulativePct', 95),
      'a', jsonb_build_object(
        'count', COALESCE((SELECT n FROM abc_agg WHERE klass = 'a'), 0),
        'revenuePct', CASE WHEN (SELECT total FROM pareto_total) > 0
          THEN ROUND(COALESCE((SELECT revenue FROM abc_agg WHERE klass = 'a'), 0) / (SELECT total FROM pareto_total) * 100, 1) ELSE 0 END
      ),
      'b', jsonb_build_object(
        'count', COALESCE((SELECT n FROM abc_agg WHERE klass = 'b'), 0),
        'revenuePct', CASE WHEN (SELECT total FROM pareto_total) > 0
          THEN ROUND(COALESCE((SELECT revenue FROM abc_agg WHERE klass = 'b'), 0) / (SELECT total FROM pareto_total) * 100, 1) ELSE 0 END
      ),
      'c', jsonb_build_object(
        'count', COALESCE((SELECT n FROM abc_agg WHERE klass = 'c'), 0),
        'revenuePct', CASE WHEN (SELECT total FROM pareto_total) > 0
          THEN ROUND(COALESCE((SELECT revenue FROM abc_agg WHERE klass = 'c'), 0) / (SELECT total FROM pareto_total) * 100, 1) ELSE 0 END
      )
    ),
    'revenueConcentration', jsonb_build_object(
      'top5Pct', CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND((SELECT top5_revenue FROM revenue_concentration_calc) / (SELECT total_revenue FROM kpi_base) * 100, 1) ELSE 0 END,
      'top10Pct', CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND((SELECT top10_revenue FROM revenue_concentration_calc) / (SELECT total_revenue FROM kpi_base) * 100, 1) ELSE 0 END
    ),
    'customerConcentration', jsonb_build_object(
      'top5Pct', CASE WHEN (SELECT total_revenue FROM kpi_base) > 0
        THEN ROUND((SELECT top5_revenue FROM customer_concentration_calc) / (SELECT total_revenue FROM kpi_base) * 100, 1) ELSE 0 END,
      'top5CustomerCount', (SELECT top5_count FROM customer_concentration_calc),
      'totalIdentifiedCustomers', (SELECT total_identified FROM customer_concentration_calc)
    ),
    'marketConcentration', COALESCE((SELECT jsonb_agg(jsonb_build_object('location', location, 'value', value, 'pct', pct)) FROM market_concentration_calc), '[]'::jsonb),
    'marginRisk', jsonb_build_object(
      'lowMarginThresholdPct', ROUND(p_low_margin_threshold * 100, 1),
      'negativeMarginProducts', COALESCE((SELECT jsonb_agg(jsonb_build_object('kode', kode, 'revenue', revenue, 'marginPct', ROUND(margin_pct * 100, 1))) FROM margin_negative), '[]'::jsonb),
      'lowMarginProducts', COALESCE((SELECT jsonb_agg(jsonb_build_object('kode', kode, 'revenue', revenue, 'marginPct', ROUND(margin_pct * 100, 1))) FROM margin_low), '[]'::jsonb)
    ),
    'salesDistribution', jsonb_build_object(
      'weekday', jsonb_build_object(
        'revenue', (SELECT weekday_revenue FROM sales_distribution_calc),
        'profit', (SELECT weekday_profit FROM sales_distribution_calc),
        'qty', (SELECT weekday_qty FROM sales_distribution_calc),
        'transaksi', (SELECT weekday_transaksi FROM sales_distribution_calc)
      ),
      'weekend', jsonb_build_object(
        'revenue', (SELECT weekend_revenue FROM sales_distribution_calc),
        'profit', (SELECT weekend_profit FROM sales_distribution_calc),
        'qty', (SELECT weekend_qty FROM sales_distribution_calc),
        'transaksi', (SELECT weekend_transaksi FROM sales_distribution_calc)
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_advanced(date, date, text, text, numeric) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek function baru terdaftar dengan 5 parameter (bukan 4 lagi):
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'analytics_advanced';
--
-- Cek grant:
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'analytics_advanced';
--
-- Cek PEMANGGILAN LAMA (4 argumen posisional) MASIH JALAN (backward compat):
-- SELECT jsonb_pretty(public.analytics_advanced(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL));
--
-- Cek field baru muncul lengkap:
-- SELECT jsonb_pretty(public.analytics_advanced(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL) -> 'abcClassification');
-- SELECT jsonb_pretty(public.analytics_advanced(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL) -> 'marginRisk');
-- SELECT jsonb_pretty(public.analytics_advanced(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL) -> 'periodComparison' -> 'wow');
--
-- Cek field LAMA tidak berubah (bandingkan dengan hasil sebelum migration
-- ini di-apply, kalau ada baseline tersimpan):
-- SELECT jsonb_pretty(public.analytics_advanced(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL) -> 'kpi');
-- ────────────────────────────────────────────────────────────
