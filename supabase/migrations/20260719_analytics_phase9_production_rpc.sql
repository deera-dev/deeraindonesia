-- ============================================================
-- Analytics (BI) — Phase 9: analytics_production()
--
-- Memindahkan /produksi/laporan (apps/admin/src/features/produksi-laporan)
-- ke tab baru "Ringkasan Produksi" di Analytics, sesuai keputusan Denny
-- (2026-07-19): halaman lama dihapus total (route + sub-nav Produksi),
-- diganti 1 RPC baru yang mengikuti Global Filter Bar Analytics
-- (p_from/p_to dari date-range preset, TIDAK ADA month picker terpisah
-- — keputusan eksplisit Denny, override rekomendasi awal untuk
-- mempertahankan month picker).
--
-- Sumber data & fallback logic (base batches) DIREPLIKASI 1:1 dari
-- get_laporan_produksi() (20260712_migration_phase1_rpc_laporan_produksi.sql)
-- supaya angka modal/HPP/bahan yang sudah dikenal Denny tidak berubah
-- diam-diam — RPC lama TETAP ADA di database (tidak dihapus, sekadar
-- tidak lagi dipanggil dari frontend manapun setelah migration frontend
-- ini selesai) sebagai referensi/rollback.
--
-- ────────────────────────────────────────────────────────────
-- FITUR BARU (ide analis, per instruksi eksplisit Denny "berikan
-- ide-ide segar apa yang harus ada di halaman ringkasan produksi")
-- ────────────────────────────────────────────────────────────
-- 1. costBreakdown per batch: biayaBahan/upahJahit/bordir/biayaStudio/
--    biayaLainnya (biayaLainnya = GREATEST(hpp - 4 komponen lain, 0),
--    menampung pin/kancing/hangtag/plastik/dll yang tidak dipecah
--    granular di skema saat ini). Sumber: hpp_snapshot (snapshot HPP
--    SAAT batch dibuat) kalau ada, fallback ke hpp_template LIVE kalau
--    batch tidak punya snapshot (4 dari 21 batch saat ini, semua batch
--    lama sebelum fitur snapshot ditambahkan).
-- 2. Pemakaian bahan per KATEGORI motif vs tambahan — PAKAI FIELD YANG
--    SUDAH ADA (`jenis` di bahan_items, sudah terisi utk 21/21 batch,
--    TIDAK ADA data hilang), BUKAN tabel/kolom baru. Keputusan final
--    Denny (2026-07-19, koreksi atas jawaban sebelumnya "tambah field
--    kategori baru"): "pakai motif dan tambahan saja soalnya udah
--    dipakai 21 batches already, no missing data, zero new tables
--    needed." Label output PERSIS "motif"/"tambahan" (bukan "polos" —
--    istilah itu tidak pernah dipakai user, jangan diperkenalkan di
--    sini). Sumber jenis PER BATCH: bahan_items dari hpp_snapshot kalau
--    ada, else dari hpp_template LIVE (match by kode_bahan atau
--    nama_bahan kalau kode_bahan kosong) — dicocokkan ke ANGKA
--    (jumlah/satuan) dari effective_bahan_dipakai yang SAMA seperti
--    get_laporan_produksi (supaya total pemakaian bahan tetap identik
--    dengan laporan lama, kategorisasi jenis murni informasi TAMBAHAN
--    lewat lookup, BUKAN sumber angka baru).
-- 3. Sell-through & realized margin per batch: unitsSoldSinceProduksi
--    (SUM net qty terjual pada `sales.items[]` utk kode_produk batch
--    ybs, sejak tanggal_produksi batch, type='sale' dikurangi
--    type='retur' — LATERAL flatten pola sama seperti
--    get_sold_summary_by_variant, lihat
--    20260719_buku_potongan_rpc_sold_summary_by_variant.sql),
--    sellThroughPct (unitsSold / total_kain × 100 — total_kain
--    dipakai sbg proksi "unit diproduksi" karena setiap potong kain di
--    modul ini menghasilkan 1 baju jadi), avgHargaJualRealized
--    (rata-rata tertimbang harga jual AKTUAL dari baris type='sale'
--    saja — retur TIDAK ikut menimbang rata-rata harga, hanya
--    mengurangi unitsSold), marginRealizedPerItem (avgHargaJualRealized
--    − hppPerItem efektif). Ini melengkapi hargaJualAvg lama (rata-rata
--    harga LISTED di katalog products.variants) dengan angka REALIZED
--    (harga jual sesungguhnya di kasir, yang bisa berbeda krn diskon
--    manual) — dua metric berbeda, sengaja DIPISAH, bukan saling
--    menggantikan.
-- 4. dataQuality.batchesMissingHpp: hitung batch dgn effective_hpp = 0
--    dalam periode filter (indikator batch yang belum ada Template HPP
--    ATAUPUN hpp_per_item manual — sinyal data yang perlu dilengkapi,
--    bukan sekadar disembunyikan sbg 0 begitu saja di UI).
--
-- ────────────────────────────────────────────────────────────
-- BATAS SCOPE (tetap, sama seperti get_laporan_produksi)
-- ────────────────────────────────────────────────────────────
-- Tagihan jatuh tempo (bahan_pembelian/bahan_pinjam) TETAP di luar RPC
-- ini — domain berbeda (utang bahan, difilter jatuh_tempo bukan
-- tanggal_produksi), tetap diambil via fetchTagihanJatuhTempo() yang
-- TIDAK disentuh migration ini, dipindah apa adanya ke
-- analytics/api.js.
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Tidak mengubah tabel/kolom/
-- index/trigger/view/RPC lain yang sudah ada (get_laporan_produksi dan
-- get_produksi_batches_total TETAP ADA, tidak dihapus/diubah).
-- ============================================================

CREATE OR REPLACE FUNCTION public.analytics_production(
  p_from date,
  p_to   date,
  p_kode text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      pb.id, pb.batch_no, pb.kode_produk, pb.nama_produk, pb.tanggal_produksi,
      pb.total_kain, pb.catatan,
      CASE
        WHEN pb.hpp_per_item IS NOT NULL AND pb.hpp_per_item > 0 THEN pb.hpp_per_item
        ELSE COALESCE(tpl.total_hpp, 0)
      END AS effective_hpp,
      CASE
        WHEN jsonb_array_length(COALESCE(pb.bahan_dipakai, '[]'::jsonb)) > 0 THEN pb.bahan_dipakai
        ELSE COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'nama_bahan', bi ->> 'nama_bahan',
                'kode_bahan', COALESCE(bi ->> 'kode_bahan', ''),
                'satuan', bi ->> 'satuan',
                'jumlah', ROUND(
                  (COALESCE((bi ->> 'qty_per_baju')::numeric, 0) * COALESCE(pb.total_kain, 0)),
                  2
                )
              )
            )
            FROM jsonb_array_elements(COALESCE(tpl.bahan_items, '[]'::jsonb)) bi
          ),
          '[]'::jsonb
        )
      END AS effective_bahan_dipakai,
      CASE
        WHEN jsonb_array_length(COALESCE(pb.hpp_snapshot -> 'bahan_items', '[]'::jsonb)) > 0
          THEN pb.hpp_snapshot -> 'bahan_items'
        ELSE COALESCE(tpl.bahan_items, '[]'::jsonb)
      END AS jenis_source_items,
      COALESCE((pb.hpp_snapshot ->> 'upah_jahit')::numeric, tpl.upah_jahit, 0) AS upah_jahit,
      COALESCE((pb.hpp_snapshot ->> 'bordir')::numeric, tpl.bordir, 0) AS bordir,
      COALESCE((pb.hpp_snapshot ->> 'biaya_studio')::numeric, tpl.biaya_studio, 0) AS biaya_studio,
      COALESCE(
        (
          SELECT SUM((bi ->> 'subtotal')::numeric)
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_array_length(COALESCE(pb.hpp_snapshot -> 'bahan_items', '[]'::jsonb)) > 0
                THEN pb.hpp_snapshot -> 'bahan_items'
              ELSE COALESCE(tpl.bahan_items, '[]'::jsonb)
            END
          ) bi
        ), 0
      ) AS biaya_bahan,
      COALESCE(hj.harga_jual, 0) AS effective_harga_jual
    FROM produksi_batch pb
    LEFT JOIN hpp_template tpl ON tpl.kode_produk = pb.kode_produk
    LEFT JOIN (
      SELECT
        kode,
        COALESCE(ROUND(AVG((v ->> 'harga')::numeric))::int, 0) AS harga_jual
      FROM products, jsonb_array_elements(COALESCE(variants, '[]'::jsonb)) v
      WHERE COALESCE((v ->> 'harga')::numeric, 0) > 0
      GROUP BY kode
    ) hj ON hj.kode = pb.kode_produk
    WHERE pb.tanggal_produksi >= p_from
      AND pb.tanggal_produksi <= p_to
      AND (p_kode IS NULL OR pb.kode_produk = p_kode)
  ),

  -- ── kategori bahan (motif/tambahan) — lihat catatan #2 di atas ──
  jenis_lookup AS (
    SELECT
      b.id AS batch_id,
      COALESCE(NULLIF(UPPER(TRIM(bi ->> 'kode_bahan')), ''), UPPER(TRIM(bi ->> 'nama_bahan'))) AS match_key,
      COALESCE(bi ->> 'jenis', 'tambahan') AS jenis
    FROM base b
    CROSS JOIN LATERAL jsonb_array_elements(b.jenis_source_items) bi
  ),
  bahan_flat AS (
    SELECT
      b.id AS batch_id,
      bh ->> 'nama_bahan' AS nama_bahan,
      bh ->> 'satuan' AS satuan,
      COALESCE((bh ->> 'jumlah')::numeric, 0) AS jumlah,
      COALESCE(jl.jenis, 'tambahan') AS jenis
    FROM base b
    CROSS JOIN LATERAL jsonb_array_elements(b.effective_bahan_dipakai) bh
    LEFT JOIN jenis_lookup jl ON jl.batch_id = b.id
      AND jl.match_key = COALESCE(NULLIF(UPPER(TRIM(bh ->> 'kode_bahan')), ''), UPPER(TRIM(bh ->> 'nama_bahan')))
  ),

  -- ── sell-through & realized margin — lihat catatan #3 di atas ──
  item_rows AS (
    SELECT
      s.type AS sale_type,
      s.date AS sale_date,
      item ->> 'kode' AS kode,
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN
          COALESCE((
            SELECT SUM(CASE WHEN (w ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (w ->> 'qty')::numeric ELSE 0 END)
            FROM jsonb_array_elements(item -> 'warna') w
          ), 0)
        ELSE CASE WHEN (item ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item ->> 'qty')::numeric ELSE 0 END
      END AS qty,
      CASE WHEN (item ->> 'harga') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item ->> 'harga')::numeric ELSE 0 END AS harga
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) item
    WHERE s.type IN ('sale', 'retur')
      AND (item ->> 'kode') IN (SELECT kode_produk FROM base)
  ),
  sell_through AS (
    SELECT
      b.id AS batch_id,
      COALESCE(SUM(
        CASE WHEN ir.sale_type = 'sale' THEN ir.qty WHEN ir.sale_type = 'retur' THEN -ir.qty ELSE 0 END
      ) FILTER (WHERE ir.sale_date >= b.tanggal_produksi), 0) AS units_sold,
      COALESCE(SUM(ir.qty * ir.harga) FILTER (WHERE ir.sale_type = 'sale' AND ir.sale_date >= b.tanggal_produksi), 0) AS revenue_sale,
      COALESCE(SUM(ir.qty) FILTER (WHERE ir.sale_type = 'sale' AND ir.sale_date >= b.tanggal_produksi), 0) AS units_sale
    FROM base b
    LEFT JOIN item_rows ir ON ir.kode = b.kode_produk
    GROUP BY b.id
  ),

  -- ── batches[] final ──────────────────────────────────────────
  batches_enriched AS (
    SELECT
      b.id, b.batch_no, b.kode_produk, b.nama_produk, b.tanggal_produksi,
      b.total_kain, b.catatan,
      b.effective_hpp AS hpp_per_item,
      b.effective_hpp * COALESCE(b.total_kain, 0) AS modal,
      b.biaya_bahan, b.upah_jahit, b.bordir, b.biaya_studio,
      GREATEST(b.effective_hpp - b.biaya_bahan - b.upah_jahit - b.bordir - b.biaya_studio, 0) AS biaya_lainnya,
      b.effective_harga_jual AS harga_jual_avg,
      st.units_sold,
      CASE WHEN COALESCE(b.total_kain, 0) > 0
        THEN ROUND((st.units_sold / b.total_kain::numeric) * 100, 1)
        ELSE 0
      END AS sell_through_pct,
      CASE WHEN st.units_sale > 0 THEN ROUND(st.revenue_sale / st.units_sale, 0) ELSE 0 END AS avg_harga_jual_realized,
      CASE WHEN st.units_sale > 0
        THEN ROUND(st.revenue_sale / st.units_sale, 0) - b.effective_hpp
        ELSE 0
      END AS margin_realized_per_item
    FROM base b
    LEFT JOIN sell_through st ON st.batch_id = b.id
  ),
  batches_json AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', be.id,
        'batchNo', be.batch_no,
        'kodeProduk', be.kode_produk,
        'namaProduk', be.nama_produk,
        'tanggalProduksi', be.tanggal_produksi,
        'totalKain', COALESCE(be.total_kain, 0),
        'catatan', be.catatan,
        'hppPerItem', be.hpp_per_item,
        'modal', be.modal,
        'costBreakdown', jsonb_build_object(
          'bahan', be.biaya_bahan,
          'jahit', be.upah_jahit,
          'bordir', be.bordir,
          'studio', be.biaya_studio,
          'lainnya', be.biaya_lainnya
        ),
        'hargaJualAvg', be.harga_jual_avg,
        'unitsSoldSinceProduksi', be.units_sold,
        'sellThroughPct', be.sell_through_pct,
        'avgHargaJualRealized', be.avg_harga_jual_realized,
        'marginRealizedPerItem', be.margin_realized_per_item
      )
      ORDER BY be.tanggal_produksi ASC
    ) AS batches
    FROM batches_enriched be
  ),

  -- ── bahanUsage[] & bahanUsageByJenis[] ──────────────────────
  bahan_usage_grouped AS (
    SELECT nama_bahan, satuan, jenis, SUM(jumlah) AS jumlah
    FROM bahan_flat
    GROUP BY nama_bahan, satuan, jenis
  ),
  bahan_usage_by_jenis_grouped AS (
    SELECT jenis, satuan, SUM(jumlah) AS jumlah
    FROM bahan_flat
    GROUP BY jenis, satuan
  )

  SELECT jsonb_build_object(
    'batches', COALESCE((SELECT batches FROM batches_json), '[]'::jsonb),
    'ringkasan', jsonb_build_object(
      'totalBatch', (SELECT COUNT(*) FROM base),
      'totalBaju', (SELECT COALESCE(SUM(COALESCE(total_kain, 0)), 0) FROM base),
      'totalModal', (SELECT COALESCE(SUM(effective_hpp * COALESCE(total_kain, 0)), 0) FROM base),
      'hppAvg', (SELECT COALESCE(ROUND(AVG(effective_hpp)), 0)::int FROM base WHERE effective_hpp > 0),
      'hargaJualAvg', (SELECT COALESCE(ROUND(AVG(effective_harga_jual)), 0)::int FROM base WHERE effective_harga_jual > 0),
      'avgSellThroughPct', (SELECT COALESCE(ROUND(AVG(sell_through_pct), 1), 0) FROM batches_enriched WHERE total_kain > 0),
      'batchesMissingHpp', (SELECT COUNT(*) FROM base WHERE effective_hpp = 0)
    ),
    'totalAllTime', (
      SELECT jsonb_build_object(
        'totalBatch', COUNT(*),
        'totalBaju', COALESCE(SUM(COALESCE(pb.total_kain, 0)), 0),
        'totalModal', COALESCE(SUM(
          (CASE WHEN pb.hpp_per_item IS NOT NULL AND pb.hpp_per_item > 0
                THEN pb.hpp_per_item ELSE COALESCE(tpl.total_hpp, 0) END)
          * COALESCE(pb.total_kain, 0)
        ), 0)
      )
      FROM produksi_batch pb
      LEFT JOIN hpp_template tpl ON tpl.kode_produk = pb.kode_produk
      WHERE (p_kode IS NULL OR pb.kode_produk = p_kode)
    ),
    'bahanUsage', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object('nama', nama_bahan, 'satuan', satuan, 'jenis', jenis, 'jumlah', jumlah)
        ORDER BY jumlah DESC
      ) FROM bahan_usage_grouped),
      '[]'::jsonb
    ),
    'bahanUsageByJenis', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object('jenis', jenis, 'satuan', satuan, 'jumlah', jumlah)
        ORDER BY jumlah DESC
      ) FROM bahan_usage_by_jenis_grouped),
      '[]'::jsonb
    ),
    'dataQuality', jsonb_build_object(
      'batchesMissingHpp', (SELECT COUNT(*) FROM base WHERE effective_hpp = 0),
      'batchesTotal', (SELECT COUNT(*) FROM base)
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_production(date, date, text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'analytics_production';
-- SELECT jsonb_pretty(public.analytics_production('2026-05-01','2026-07-31',NULL));
-- SELECT jsonb_pretty(public.analytics_production('2026-05-01','2026-07-31',NULL) -> 'ringkasan');
-- SELECT jsonb_pretty(public.analytics_production('2026-05-01','2026-07-31',NULL) -> 'bahanUsageByJenis');
-- Bandingkan totalModal/hppAvg/bahanUsage dgn get_laporan_produksi utk periode sama — HARUS identik:
-- SELECT jsonb_pretty(public.get_laporan_produksi('2026-05-01','2026-07-31') -> 'ringkasan');
