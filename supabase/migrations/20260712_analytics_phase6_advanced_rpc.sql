-- ============================================================
-- Analytics (BI) — Phase 6: analytics_advanced()
--
-- Lanjutan dari Phase 1-5 (sales_flat + analytics_trend + analytics_overview
-- + analytics_products + analytics_markets + analytics_market_detail +
-- analytics_customers). Scope migration ini HANYA 1 fungsi baru:
-- analytics_advanced() untuk tab baru "Advanced" — insight bisnis tingkat
-- lanjut sesuai roadmap Phase 6 (Return Rate, Margin Analysis portfolio,
-- Top Growth/Declining Product, Revenue/Profit Contribution, Product Mix,
-- Pareto 80/20, New vs Returning Revenue, Average Basket Size, Average Item
-- per Transaksi, Weekday Performance, Hourly Performance, MoM/YoY).
-- TIDAK ADA perubahan pada RPC Phase 1-5 yang sudah ada — seluruhnya
-- di-reuse APA ADANYA lewat `FROM sales_flat(...)`, TIDAK ADA logika unnest
-- jsonb yang ditulis ulang di migration ini.
--
-- SENGAJA TIDAK DIBUAT sebagai RPC terpisah ("Revenue vs Profit Comparison"
-- dan sebagian besar "Monthly Comparison" sebagai deret waktu) — kedua
-- metric itu SUDAH tercakup oleh tab Trends existing (chart gabungan
-- Revenue/Profit/Qty dengan toggle granularity Bulanan, lihat TrendsTab.jsx
-- + analytics_trend()). Membuat RPC/komponen baru untuk hal yang sama akan
-- melanggar aturan umum roadmap ("Tidak duplicate business logic/SQL/
-- component", "Reuse TrendChart"). Yang BENAR-BENAR baru di sini untuk
-- "Monthly/Yearly Comparison" adalah ringkasan MoM/YoY (delta % 2 periode
-- kalender terakhir yang SUDAH SELESAI) — bukan deret waktu penuh.
--
-- ════════════════════════════════════════════════════════════
-- analytics_advanced(p_from, p_to, p_location, p_kode)
-- ════════════════════════════════════════════════════════════
--
-- Return jsonb:
--   {
--     kpi: {
--       returnRate: number,            -- 0..1, unit-based: |qty retur| / qty sale (periode+filter)
--       returnRevenueImpact: number,   -- Rupiah, POSITIF = besar revenue yang "hilang" karena retur
--       overallMarginPct: number,      -- 0..1, totalProfit / totalRevenue portfolio (periode+filter)
--       avgBasketSize: number,         -- rata2 qty per transaksi type=sale
--       avgItemPerTransaksi: number    -- rata2 JUMLAH KODE PRODUK BERBEDA per transaksi (lihat catatan)
--     },
--     growth: {
--       topGrowth:    [{kode, currentRevenue, previousRevenue, growthPct}, ...],  -- top 5
--       topDeclining: [{kode, currentRevenue, previousRevenue, growthPct}, ...]   -- top 5 (paling turun)
--     },
--     contribution: {
--       revenueByProduct: [{kode, value, pct}, ...],  -- top 10, value=revenue, pct=% dari totalRevenue
--       profitByProduct:  [{kode, value, pct}, ...]   -- top 10, value=profit,  pct=% dari totalProfit
--     },
--     productMix: [{bahan, value, pct}, ...],  -- value=revenue per `products.bahan` (proxy kategori)
--     pareto: {
--       items: [{kode, value, cumulativePct}, ...],  -- MAKSIMAL 50 baris (lihat catatan LIMIT)
--       productsFor80Pct: N,   -- jumlah produk (dari ranking penuh, TIDAK dibatasi 50) utk capai 80% revenue
--       totalProducts: N       -- total produk dengan revenue > 0 pada periode+filter
--     },
--     newVsReturning: {
--       newRevenue, returningRevenue, anonymousRevenue: number,
--       newCustomerCount, returningCustomerCount: integer
--     },
--     weekdayPerformance: [{dow, label, revenue, profit, qty, transaksi}, ...],  -- SELALU 7 baris (Senin..Minggu)
--     hourlyPerformance:  [{hour, revenue, profit, qty, transaksi}, ...],        -- SELALU 24 baris (00..23, WIB)
--     periodComparison: {
--       mom: {currentRevenue, previousRevenue, pctChange} | null,
--       yoy: {currentRevenue, previousRevenue, pctChange} | null
--     }
--   }
--
-- ────────────────────────────────────────────────────────────
-- Business rule & KETERBATASAN DATA (dibaca WAJIB sebelum konsumsi FE)
-- ────────────────────────────────────────────────────────────
--
-- kpi.returnRate — berbasis UNIT (qty), BUKAN revenue: |SUM(qty) type=retur|
--   ÷ SUM(qty) type=sale, dalam periode+filter aktif. 0 kalau qty sale = 0
--   (bukan NULL/error, konsisten pola RPC lain di repo ini).
--
-- kpi.overallMarginPct — margin PORTFOLIO (1 angka agregat), BEDA dari
--   marginTertinggi/marginTerendah di analytics_products (Phase 2) yang
--   PER-PRODUK. Tidak ada duplikasi logika — ini level agregasi berbeda.
--
-- kpi.avgItemPerTransaksi — didefinisikan sebagai rata-rata JUMLAH KODE
--   PRODUK BERBEDA (COUNT DISTINCT kode) per sale_id, BUKAN jumlah baris
--   checkout asli. Ini KETERBATASAN YANG DIDOKUMENTASIKAN: granularitas
--   "1 baris checkout" (yang bisa berisi banyak warna sekaligus) sudah
--   hilang setelah dipecah oleh sales_flat() per warna (lihat catatan di
--   20260712_analytics_phase1_rpc.sql §1). COUNT DISTINCT kode adalah proxy
--   paling wajar untuk "variasi produk per transaksi" yang bisa dihitung
--   dari data yang tersedia SEKARANG, TANPA mengarang angka.
--
-- growth.topGrowth/topDeclining — membandingkan REVENUE periode aktif
--   [p_from,p_to] terhadap periode SEBELUMNYA dengan PANJANG SAMA PERSIS
--   (immediately preceding: prev_to = p_from - 1, prev_from = prev_to -
--   panjang periode + 1). HANYA menyertakan kode dengan previousRevenue > 0
--   (mencegah growthPct tak terhingga dari basis nol) — kode yang baru
--   muncul di periode ini (tidak ada di periode sebelumnya) TIDAK tampil di
--   sini (bukan bug — secara matematis "growth dari nol" tidak informatif,
--   beda kasus dari newVsReturning yang memang soal customer, bukan produk).
--
-- contribution — pct dihitung terhadap total portfolio (totalRevenue/
--   totalProfit dari SELURUH produk pada periode+filter, termasuk yang
--   TIDAK masuk top 10) — jadi total pct top-10 TIDAK harus 100%.
--
-- productMix — kategori PROXY memakai `products.bahan` (BUKAN sistem
--   kategori sungguhan — CLAUDE.md/ANALYTICS_ARCHITECTURE_PLAN.md §12
--   sudah eksplisit menunda "Category Filter" karena tidak ada kolom
--   kategori asli; `bahan` dipakai di sini dengan pola yang SAMA seperti
--   keputusan itu). Kode produk yang sudah dihapus dari `products` (LEFT
--   JOIN NULL) dikelompokkan sebagai "Lainnya" supaya revenue-nya tidak
--   hilang dari total, bukan supaya diseragamkan secara palsu.
--
-- pareto — `items` DIBATASI 50 baris (PARETO_ITEMS_LIMIT, konsisten pola
--   LIMIT lain di repo ini) untuk mencegah payload tak terbatas kalau basis
--   produk besar. TAPI `productsFor80Pct`/`totalProducts` dihitung dari
--   RANKING PENUH (tidak dibatasi 50) — jadi kedua angka itu SELALU akurat
--   walau daftar `items` yang dikirim ke FE terpotong di 50. Kalau
--   `productsFor80Pct` > 50, FE tidak akan bisa menampilkan seluruh baris
--   sampai produk ke-N — ini keterbatasan payload yang disengaja, BUKAN
--   angka yang salah.
--
-- newVsReturning — pola "customer baru" MEREPLIKASI persis logika
--   insight.customerBaru di analytics_customers (Phase 4): pelanggan
--   dianggap "new" kalau tanggal transaksi PERTAMA mereka ALL-TIME (dicari
--   lewat sales_flat rentang sangat lebar, tetap menghormati p_location/
--   p_kode) JATUH DI DALAM [p_from,p_to]. Selain itu "returning". Walk-in
--   (pelanggan_id NULL) dipisah ke `anonymousRevenue`, TIDAK masuk hitungan
--   new/returning (konsisten §8.3 seperti Phase 4).
--
-- weekdayPerformance — SELALU 7 baris (Senin..Minggu, ISODOW 1..7) walau
--   sebagian hari tanpa transaksi (zero-filled) — BEDA dari analytics_trend
--   yang SENGAJA tidak zero-fill (di sana domainnya tanggal, tidak
--   terbatas; di sini domainnya cuma 7 nilai tetap, zero-fill masuk akal
--   supaya bar chart selalu utuh 7 batang).
--
-- hourlyPerformance — SELALU 24 baris (00..23, zero-filled, alasan sama
--   seperti weekdayPerformance). **ASUMSI PENTING YANG HARUS DIVALIDASI
--   MANUAL SEKALI OLEH DENNY**: jam diambil dari `sales.created_at`
--   (timestamptz) dikonversi eksplisit ke zona waktu 'Asia/Jakarta' (WIB,
--   UTC+7) — karena bisnis ini berlokasi di Indonesia. Kalau ternyata
--   server/klien yang menulis `created_at` menyimpan jam lokal SEOLAH-OLAH
--   UTC (tanpa offset yang benar), hasil jam di sini bisa bergeser. Cara
--   cepat validasi: bandingkan 1-2 transaksi yang jam checkout aslinya
--   diketahui pasti (mis. baru saja input) dengan baris hourlyPerformance
--   yang muncul. Baris dengan `created_at IS NULL` (data sangat lama)
--   DIKECUALIKAN dari hourlyPerformance (tidak bisa dikarang jamnya).
--
-- periodComparison.mom/yoy — membandingkan 2 periode kalender PENUH yang
--   SUDAH SELESAI (BUKAN bulan/tahun berjalan yang belum lengkap, supaya
--   perbandingan adil) — MoM: bulan lalu vs bulan sebelum itu. YoY: tahun
--   lalu vs tahun sebelum itu. INI TIDAK MENGIKUTI p_from/p_to (selalu
--   relatif ke CURRENT_DATE, mirip pola field "all-time" di
--   analytics_customers) — HANYA menghormati p_location/p_kode. Kalau
--   histori data toko belum mencakup 2 periode penuh (mis. toko baru
--   beroperasi < 2 bulan atau < 2 tahun), field ini `null` — BUKAN dikira-
--   kira jadi 0 atau angka lain. Ini KETERBATASAN DATA YANG NYATA, FE WAJIB
--   menampilkan pesan "Data belum cukup" saat null, bukan menyembunyikannya
--   diam-diam sebagai 0.
--
-- Idempotent, SECURITY INVOKER, dibangun di atas sales_flat() — tidak
-- menulis ulang logika unnest jsonb atau logika RPC Phase 1-5 lain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_advanced(
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
        ) ELSE NULL END
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_advanced(date, date, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- SELECT proname FROM pg_proc WHERE proname = 'analytics_advanced';
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'analytics_advanced';
--
-- Cek 30 hari terakhir, semua market/produk:
-- SELECT jsonb_pretty(public.analytics_advanced(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL));
--
-- Validasi manual zona waktu hourlyPerformance (WAJIB sekali sebelum
-- production-ready sepenuhnya — lihat catatan di atas): bandingkan jam
-- transaksi nyata dengan hasil `hourlyPerformance` untuk 1-2 sale terbaru.
-- ────────────────────────────────────────────────────────────
