-- ============================================================
-- Analytics (BI) — Phase 4: analytics_customers()
--
-- Lanjutan dari Phase 1-3 (sales_flat + analytics_trend + analytics_overview
-- + analytics_products + analytics_markets + analytics_market_detail).
-- Scope migration ini HANYA 1 fungsi baru: analytics_customers() untuk tab
-- Customers — mengikuti desain yang sudah disepakati di
-- ANALYTICS_ARCHITECTURE_PLAN.md §5.7, §3.4, §8.3, dan keputusan final
-- Denny di §12 poin 4 (Repeat Customer & LTV = ALL-TIME). TIDAK ada
-- perubahan pada sales_flat(), analytics_trend(), analytics_overview(),
-- analytics_products(), analytics_markets(), atau analytics_market_detail()
-- yang sudah ada — seluruhnya di-reuse APA ADANYA lewat
-- `FROM sales_flat(...)`, TIDAK ADA logika unnest jsonb yang ditulis ulang
-- di migration ini (konsisten dengan §5.1 dan seluruh RPC sebelumnya).
--
-- CATATAN PENTING soal identitas customer di output (requirement change
-- 2026-07, BERBEDA dari Products): customer TIDAK punya "kode" seperti
-- produk — identitas alaminya memang `nama` (+ `pelangganId` sebagai key
-- teknis untuk React/JOIN, bukan pengganti nama). Standar "pakai kode,
-- bukan nama" yang berlaku di seluruh Products TIDAK berlaku di sini —
-- Denny sudah eksplisit mengonfirmasi ini HANYA soal identitas PRODUK.
--
-- ════════════════════════════════════════════════════════════
-- analytics_customers(p_from, p_to, p_location, p_kode)
-- ════════════════════════════════════════════════════════════
--
-- Dibangun di atas sales_flat() (Phase 1) untuk SELURUH metric — termasuk
-- field "all-time" (repeatCustomer/ltv/customerBaru), yang dicapai dengan
-- MEMANGGIL sales_flat() dengan rentang tanggal SANGAT LEBAR
-- ('1900-01-01'..'9999-12-31') alih-alih menulis ulang logika unnest —
-- lihat catatan "all-time" di bawah untuk alasan kenapa ini BEDA dari
-- pendekatan analytics_products() (yang membaca `sales` mentah untuk
-- tidakPernahTerjual, karena kebutuhannya cuma EXISTS kode, bukan
-- agregasi revenue/qty bertanda seperti di sini).
--
-- Parameter:
--   p_location   NULL = semua market. Filter ini HANYA mempersempit data
--                (leaderboard/ranking/insight periode DAN insight all-time
--                sama-sama menghormati p_location — lihat catatan
--                "all-time" di bawah soal kenapa field all-time TETAP
--                menghormati p_location/p_kode walau TIDAK menghormati
--                p_from/p_to).
--   p_kode       NULL = semua produk. Kalau diisi, SELURUH metric (termasuk
--                yang all-time) dipersempit ke pelanggan yang bertransaksi
--                dengan produk tsb — misal insight.ltv dengan p_kode diisi
--                berarti "rata-rata total belanja all-time pelanggan aktif
--                periode ini, DIHITUNG HANYA dari transaksi produk tsb",
--                BUKAN LTV murni lintas seluruh produk. Ini KONSISTEN
--                dengan prinsip "seluruh widget mengikuti Global Filter"
--                yang sudah dipakai di analytics_products (lihat §12 poin 2
--                & 3 di situ) — bukan penyimpangan baru.
--
-- Return jsonb:
--   {
--     leaderboard: {
--       revenueTertinggi: [{pelangganId, nama, value}, ...],  -- top 10
--       profitTertinggi:  [{pelangganId, nama, value}, ...],  -- top 10
--       qtyTerbanyak:     [{pelangganId, nama, value}, ...]   -- top 10
--     },
--     insight: {
--       customerBaru:              N,       -- lihat catatan di bawah
--       repeatCustomer:            N,       -- ALL-TIME, §12 poin 4
--       avgOrder:                  number,  -- periode filter, pelanggan bernama saja
--       ltv:                       number,  -- ALL-TIME, §3.4 & §5.7
--       anonymousTransactionCount: N,       -- periode filter, walk-in (§8.3)
--       anonymousRevenue:          number   -- periode filter, walk-in (§8.3)
--     },
--     ranking: [{pelangganId, nama, revenue, profit, qty, jumlahTransaksi}, ...]
--       -- diurut revenue DESC, dibatasi CUSTOMER_RANKING_LIMIT (lihat
--       -- catatan LIMIT di bawah) — TABEL ranking periode filter (BUKAN
--       -- all-time), berbeda dari 3 leaderboard di atas yang cuma top 10
--       -- masing-masing per metric.
--   }
--
-- ────────────────────────────────────────────────────────────
-- Business rule per section (keputusan final Denny, ANALYTICS_ARCHITECTURE_PLAN.md §12/§3.4/§8.3)
-- ────────────────────────────────────────────────────────────
--
-- leaderboard & ranking (PERIODE FILTER, bukan all-time):
--   - Seluruhnya HANYA menyertakan pelanggan_id IS NOT NULL (walk-in/
--     anonim dikecualikan dari leaderboard & ranking per-customer — lihat
--     §8.3, dan insight.anonymous* di bawah untuk transparansi datanya).
--   - revenueTertinggi/profitTertinggi/qtyTerbanyak HANYA menyertakan
--     pelanggan dengan value > 0 bersih (setelah retur) — KOREKSI YANG
--     DISENGAJA, pola sama persis dengan leaderboard di analytics_products
--     (mencegah pelanggan dengan retur > pembelian nongol sebagai "top").
--   - ranking TIDAK difilter value > 0 (tabel ranking menampilkan APA
--     ADANYA termasuk revenue/profit negatif kalau ada, supaya Denny bisa
--     lihat pelanggan dengan retur besar juga) — HANYA dibatasi LIMIT
--     CUSTOMER_RANKING_LIMIT (50) untuk mencegah payload tak terbatas kalau
--     basis pelanggan sudah besar (mitigasi sama seperti §10 dokumen
--     desain: "payload RPC besar kalau leaderboard tidak dibatasi").
--     Drill-down/paginasi per-pelanggan penuh (kalau basis pelanggan makin
--     besar) adalah kandidat Phase 5, BUKAN dikerjakan di sini.
--
-- insight.avgOrder (PERIODE FILTER, keputusan interpretasi — didokumentasikan
-- eksplisit karena §3.4 menulis definisi ini "per customer" secara ringkas):
--   - Dihitung sebagai AGREGAT (SATU angka, BUKAN array per-pelanggan):
--     SUM(revenue) ÷ COUNT(DISTINCT sale_id) HANYA dari transaksi dengan
--     pelanggan_id IS NOT NULL dalam periode+filter aktif — persis pola
--     `aov` di analytics_overview (Phase 1), hanya scope-nya dipersempit ke
--     transaksi bernama saja (konsisten dengan tab Customers yang memang
--     soal pelanggan, bukan transaksi anonim). ROUND ke integer, 0 kalau
--     tidak ada transaksi bernama (bukan NULL/error).
--
-- insight.ltv (ALL-TIME, §3.4 & §5.7 — keputusan interpretasi, didokumentasikan
-- eksplisit karena "LTV per customer" di §3.4 juga SATU angka aggregate di
-- sini, bukan array):
--   - Untuk SETIAP pelanggan yang AKTIF pada periode filter saat ini (mis.
--     pernah bertransaksi & masuk `cust_agg`), dihitung SUM(revenue)
--     ALL-TIME (seluruh riwayat, tidak dibatasi p_from/p_to) milik
--     pelanggan tsb — lalu insight.ltv = RATA-RATA dari nilai-nilai
--     lifetime tsb (AVG, ROUND ke integer). Makna praktisnya: "pelanggan
--     yang aktif periode ini, rata-rata bernilai berapa sepanjang riwayat
--     mereka dengan toko" — metrik retensi/kualitas pelanggan periode ini,
--     BUKAN LTV seluruh pelanggan yang pernah ada (yang tidak actionable
--     untuk periode yang sedang dilihat Denny).
--
-- insight.customerBaru (klasifikasi PAKAI p_from/p_to, TAPI window pencarian
-- "tanggal pertama"-nya ALL-TIME — §3.4):
--   - Untuk setiap pelanggan (dengan minimal 1 transaksi yang lolos filter
--     p_location/p_kode KAPAN SAJA), dicari MIN(tanggal) ALL-TIME (dari
--     SELURUH baris sale MAUPUN retur milik pelanggan tsb — retur
--     menyiratkan pernah ada pembelian sebelumnya, sama seperti alasan di
--     tidakPernahTerjual pada analytics_products). Pelanggan dihitung
--     "Customer Baru" kalau MIN(tanggal) ALL-TIME tsb JATUH DI DALAM
--     [p_from, p_to] yang sedang aktif — BUKAN pelanggan yang sekadar
--     bertransaksi pertama kali dalam periode filter kalau ternyata mereka
--     sudah pernah beli sebelum periode ini (itu bukan "baru").
--
-- insight.repeatCustomer (ALL-TIME, §12 poin 4 — TIDAK dibatasi p_from/p_to):
--   - COUNT pelanggan dengan COUNT(DISTINCT sale_id) ALL-TIME > 1 (dihitung
--     dari `sales_flat` rentang lebar, TETAP menghormati p_location/p_kode
--     seperti field all-time lain di RPC ini) — SATU LAGI kasus di mana 1
--     field dalam RPC ini sengaja punya scope waktu berbeda dari field lain
--     di RPC yang sama (pola SAMA seperti tidakPernahTerjual di
--     analytics_products) — WAJIB dibaca sebagai keputusan desain, BUKAN
--     bug.
--
-- insight.anonymousTransactionCount / anonymousRevenue (PERIODE FILTER,
-- §8.3 — TRANSPARANSI walk-in, bukan bagian dari leaderboard/ranking):
--   - Dihitung dari baris `sales_flat` periode+filter aktif dengan
--     pelanggan_id IS NULL. anonymousTransactionCount = COUNT(DISTINCT
--     sale_id) FILTER (type='sale') — pola sama dengan totalTransaksi di
--     analytics_overview (mencegah inflate dari banyak item per transaksi).
--     anonymousRevenue = SUM(revenue) baris tsb (retur sudah bertanda
--     negatif dari sales_flat, tidak dikurangi lagi).
--   - Total Revenue/Profit keseluruhan bisnis TETAP dihitung di
--     analytics_overview (mencakup transaksi anonim) — field ini di sini
--     HANYA untuk transparansi "berapa % data yang tidak masuk analisis
--     per-customer", BUKAN pengganti KPI Overview.
--
-- Edge case:
--   - Tidak ada transaksi bernama sama sekali pada periode/filter ->
--     leaderboard/ranking = [], avgOrder = 0 (CTE `named`/`cust_agg`
--     kosong -> turunannya ikut kosong).
--   - Tidak ada pelanggan aktif periode ini yang punya riwayat all-time
--     (mustahil secara logis karena pelanggan aktif periode ini SUDAH
--     PASTI punya minimal transaksi all-time, yaitu transaksi periode ini
--     sendiri) -> ltv tetap terhitung wajar, tidak ada kasus 0/0 baru di
--     luar yang sudah di-COALESCE.
--   - p_from > p_to -> sales_flat(p_from,p_to) 0 baris (BETWEEN terbalik
--     tidak match apa pun) -> leaderboard/ranking/avgOrder/anonymous* = 0
--     atau []; customerBaru = 0 (tidak ada window [p_from,p_to] valid untuk
--     match MIN(tanggal) all-time manapun); ltv = 0 (populasi `ltv_active`
--     berasal dari `cust_agg`, yang JUGA kosong kalau p_from > p_to,
--     lihat catatan "insight.ltv" di atas soal populasinya YANG
--     PERIODE-SCOPED walau nilai lifetime tiap pelanggannya sendiri
--     all-time) — SEMUA ini konsisten dengan seluruh RPC Analytics lain.
--     repeatCustomer TIDAK terpengaruh SAMA SEKALI oleh p_from/p_to (baik
--     valid maupun terbalik) karena `alltime`/`alltime_agg`/`repeat_customer`
--     TIDAK PERNAH mereferensikan p_from/p_to sama sekali — SATU-SATUNYA
--     field di RPC ini yang benar-benar 100% independen dari parameter
--     tanggal, beda dengan customerBaru/ltv yang tetap "menyentuh"
--     p_from/p_to lewat cara masing-masing di atas.
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Tidak mengubah sales_flat(),
-- analytics_trend(), analytics_overview(), analytics_products(),
-- analytics_markets(), analytics_market_detail(), atau tabel/index apa pun
-- yang sudah ada. Tidak membuat tabel/index/trigger/view baru.
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_customers(
  p_from      date,
  p_to        date,
  p_location  text,
  p_kode      text
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
  named AS (
    SELECT * FROM filtered WHERE pelanggan_id IS NOT NULL
  ),
  anon AS (
    SELECT * FROM filtered WHERE pelanggan_id IS NULL
  ),
  cust_agg AS (
    SELECT
      pelanggan_id,
      SUM(revenue) AS total_revenue,
      SUM(profit)  AS total_profit,
      SUM(qty)     AS total_qty,
      COUNT(DISTINCT sale_id) FILTER (WHERE type = 'sale') AS jumlah_transaksi
    FROM named
    GROUP BY pelanggan_id
  ),

  -- ── leaderboard (periode filter, value > 0 saja) ────────────
  revenue_tertinggi AS (
    SELECT pelanggan_id, total_revenue AS value
    FROM cust_agg WHERE total_revenue > 0
    ORDER BY total_revenue DESC LIMIT 10
  ),
  profit_tertinggi AS (
    SELECT pelanggan_id, total_profit AS value
    FROM cust_agg WHERE total_profit > 0
    ORDER BY total_profit DESC LIMIT 10
  ),
  qty_terbanyak AS (
    SELECT pelanggan_id, total_qty AS value
    FROM cust_agg WHERE total_qty > 0
    ORDER BY total_qty DESC LIMIT 10
  ),

  -- ── ranking (periode filter, TANPA filter value > 0, dibatasi LIMIT 50) ──
  ranking_base AS (
    SELECT pelanggan_id, total_revenue, total_profit, total_qty, jumlah_transaksi
    FROM cust_agg
    ORDER BY total_revenue DESC
    LIMIT 50
  ),

  -- ── insight periode filter: avgOrder (pelanggan bernama saja) ──
  insight_periode AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS total_revenue_named,
      COUNT(DISTINCT sale_id) FILTER (WHERE type = 'sale') AS total_transaksi_named
    FROM named
  ),

  -- ── insight periode filter: anonymous (walk-in, transparansi §8.3) ──
  insight_anon AS (
    SELECT
      COUNT(DISTINCT sale_id) FILTER (WHERE type = 'sale') AS anon_transaksi,
      COALESCE(SUM(revenue), 0) AS anon_revenue
    FROM anon
  ),

  -- ── all-time (repeatCustomer/ltv/customerBaru — §12 poin 4 & §3.4) ──
  -- Rentang lebar dipilih supaya TETAP reuse sales_flat() apa adanya
  -- (tidak menulis ulang unnest jsonb) sekaligus mencakup "sepanjang
  -- riwayat toko" tanpa perlu tahu tanggal transaksi paling lama.
  alltime AS (
    SELECT sf.*
    FROM sales_flat('1900-01-01'::date, '9999-12-31'::date) sf
    WHERE (p_location IS NULL OR sf.location = p_location)
      AND (p_kode IS NULL OR sf.kode = p_kode)
      AND sf.pelanggan_id IS NOT NULL
  ),
  alltime_agg AS (
    SELECT
      pelanggan_id,
      SUM(revenue)                 AS ltv_value,
      COUNT(DISTINCT sale_id)      AS jumlah_transaksi_alltime,
      MIN(tanggal)                 AS first_purchase_date
    FROM alltime
    GROUP BY pelanggan_id
  ),
  customer_baru AS (
    SELECT pelanggan_id
    FROM alltime_agg
    WHERE first_purchase_date BETWEEN p_from AND p_to
  ),
  repeat_customer AS (
    SELECT pelanggan_id
    FROM alltime_agg
    WHERE jumlah_transaksi_alltime > 1
  ),
  ltv_active AS (
    -- HANYA pelanggan yang aktif (punya transaksi bernama) pada periode
    -- filter saat ini — lihat catatan "insight.ltv" di atas.
    SELECT at.ltv_value
    FROM alltime_agg at
    JOIN cust_agg ca ON ca.pelanggan_id = at.pelanggan_id
  )

  SELECT jsonb_build_object(
    'leaderboard', jsonb_build_object(
      'revenueTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('pelangganId', rt.pelanggan_id, 'nama', p.nama, 'value', rt.value) ORDER BY rt.value DESC)
         FROM revenue_tertinggi rt JOIN pelanggan p ON p.id = rt.pelanggan_id),
        '[]'::jsonb
      ),
      'profitTertinggi', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('pelangganId', pt.pelanggan_id, 'nama', p.nama, 'value', pt.value) ORDER BY pt.value DESC)
         FROM profit_tertinggi pt JOIN pelanggan p ON p.id = pt.pelanggan_id),
        '[]'::jsonb
      ),
      'qtyTerbanyak', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('pelangganId', qt.pelanggan_id, 'nama', p.nama, 'value', qt.value) ORDER BY qt.value DESC)
         FROM qty_terbanyak qt JOIN pelanggan p ON p.id = qt.pelanggan_id),
        '[]'::jsonb
      )
    ),
    'insight', jsonb_build_object(
      'customerBaru', (SELECT COUNT(*) FROM customer_baru),
      'repeatCustomer', (SELECT COUNT(*) FROM repeat_customer),
      'avgOrder', CASE
        WHEN (SELECT total_transaksi_named FROM insight_periode) > 0
          THEN ROUND((SELECT total_revenue_named FROM insight_periode) / (SELECT total_transaksi_named FROM insight_periode))
        ELSE 0
      END,
      'ltv', COALESCE((SELECT ROUND(AVG(ltv_value)) FROM ltv_active), 0),
      'anonymousTransactionCount', COALESCE((SELECT anon_transaksi FROM insight_anon), 0),
      'anonymousRevenue', COALESCE((SELECT anon_revenue FROM insight_anon), 0)
    ),
    'ranking', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'pelangganId', rb.pelanggan_id,
          'nama', p.nama,
          'revenue', rb.total_revenue,
          'profit', rb.total_profit,
          'qty', rb.total_qty,
          'jumlahTransaksi', rb.jumlah_transaksi
        ) ORDER BY rb.total_revenue DESC)
       FROM ranking_base rb JOIN pelanggan p ON p.id = rb.pelanggan_id),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_customers(date, date, text, text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'analytics_customers';
--
-- Cek grant:
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'analytics_customers';
--
-- Cek hasil untuk 30 hari terakhir, semua market/produk:
-- SELECT jsonb_pretty(public.analytics_customers(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL));
--
-- Cek repeatCustomer benar ALL-TIME dan 100% TIDAK terpengaruh p_from/p_to
-- (selama p_location/p_kode tidak diubah, hasil HARUS SELALU SAMA -- tanpa
-- kecuali, lihat catatan edge case di atas):
-- SELECT public.analytics_customers('2026-07-01','2026-07-31',NULL,NULL) -> 'insight' ->> 'repeatCustomer';
-- SELECT public.analytics_customers('2020-01-01','2020-01-31',NULL,NULL) -> 'insight' ->> 'repeatCustomer';
-- (kedua hasil di atas HARUS SAMA PERSIS)
--
-- Cek insight.ltv (SEBALIKNYA dari repeatCustomer) BISA BERBEDA antar window
-- p_from/p_to yang berbeda -- ini BUKAN bug, karena populasi "pelanggan
-- aktif periode ini" yang di-AVG memang berbeda per window (lihat catatan
-- "insight.ltv" di atas):
-- SELECT public.analytics_customers('2026-07-01','2026-07-31',NULL,NULL) -> 'insight' ->> 'ltv';
-- SELECT public.analytics_customers('2020-01-01','2020-01-31',NULL,NULL) -> 'insight' ->> 'ltv';
--
-- Cek anonymousTransactionCount + anonymousRevenue TIDAK ikut masuk ranking/leaderboard:
-- SELECT jsonb_pretty(public.analytics_customers(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL) -> 'insight');
-- SELECT jsonb_array_length(public.analytics_customers(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL) -> 'ranking');
