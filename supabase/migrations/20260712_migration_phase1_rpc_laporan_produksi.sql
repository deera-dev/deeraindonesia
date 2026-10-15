-- ============================================================
-- Migration Phase 1 — RPC get_laporan_produksi()
--
-- Melanjutkan migrasi RPC dengan filosofi yang sama seperti
-- approve_transfer, get_sales_summary_by_product, get_stock_summary,
-- dan get_produksi_batches_total (versi Full Aggregate): PostgreSQL =
-- seluruh business logic, frontend = presentation layer.
--
-- Nama & desain RPC ini SUDAH direncanakan sebelumnya di
-- MIGRATION_ROADMAP.md §3.1.7 ("Laporan Produksi Bulanan — agregasi +
-- enrichment N+1") — migration ini merealisasikan rencana tersebut.
--
-- Menggantikan implementasi lama yang tersebar di 3 tempat:
--   apps/admin/src/features/produksi-laporan/api.js   (fetchProduksiBatches)
--   apps/admin/src/features/produksi-laporan/utils.js (calcRingkasan, calcBahanUsage)
--   apps/admin/src/features/produksi-laporan/components/ProduksiLaporanPage.jsx
--     (baris `const modalBatch = (b.hpp_per_item||0)*(b.total_kain||0)`)
--   apps/admin/src/features/produksi-laporan/components/BatchDetail.jsx
--     (baris `const totalModal = (batch.hpp_per_item||0)*(batch.total_kain||0)`)
--
-- ────────────────────────────────────────────────────────────
-- BUSINESS LOGIC LAMA (di JS) yang dipindahkan ke SQL di sini
-- ────────────────────────────────────────────────────────────
-- 1. fetchProduksiBatches({fromDate,toDate}) — 3 query berurutan:
--    a. SELECT * FROM produksi_batch WHERE tanggal_produksi BETWEEN ...
--    b. (kondisional) SELECT kode_produk,total_hpp,bahan_items FROM
--       hpp_template WHERE kode_produk IN (kode yang hpp_per_item-nya
--       falsy ATAU bahan_dipakai-nya kosong)
--    c. (kondisional) SELECT kode,variants FROM products WHERE kode IN
--       (SEMUA kode_produk di batch periode ini)
--    Lalu di JS: per-batch enrichment —
--      hpp_per_item efektif = hpp_per_item (kalau truthy) ATAU
--        template.total_hpp ATAU 0
--      bahan_dipakai efektif = bahan_dipakai (kalau sudah ada isinya)
--        ATAU diturunkan dari template.bahan_items × total_kain,
--        dibulatkan 2 desimal
--      harga_jual = rata-rata variant.harga (yang >0) per kode_produk,
--        dibulatkan ke integer
-- 2. calcRingkasan(batches, tagihan) — SUM/AVG di JS atas array batches
--    hasil #1: totalBaju (SUM total_kain), totalModal (SUM hpp×kain),
--    hppAvg (AVG hpp_per_item WHERE >0), hargaJualAvg (AVG harga_jual
--    WHERE >0). totalTagihan (SUM tagihan.total_harga) TETAP di JS
--    karena sumbernya beda tabel sama sekali (bahan_pembelian/
--    bahan_pinjam, lihat "BATAS SCOPE" di bawah).
-- 3. calcBahanUsage(batches) — GROUP BY nama_bahan+satuan atas seluruh
--    bahan_dipakai (versi efektif dari #1) lintas semua batch periode
--    ini, SUM jumlah, urut desc.
-- 4. Perhitungan modal PER BATCH (`hpp_per_item × total_kain`) yang
--    sebelumnya dihitung ULANG secara terpisah di 2 komponen React
--    (ProduksiLaporanPage.jsx utk baris ringkas, BatchDetail.jsx utk
--    panel detail) — sekarang jadi 1 field `modal` per batch, dihitung
--    sekali di SQL.
--
-- ────────────────────────────────────────────────────────────
-- PERBAIKAN BUG untuk KONSISTENSI dengan get_produksi_batches_total
-- ────────────────────────────────────────────────────────────
-- Business rule effective_hpp di sini DISAMAKAN dengan yang sudah
-- diperbaiki di get_produksi_batches_total (migration terdahulu):
--   effective_hpp = IF hpp_per_item IS NOT NULL AND hpp_per_item > 0
--                   THEN hpp_per_item ELSE COALESCE(template.total_hpp, 0)
-- BUKAN truthy check `hpp_per_item ? ... : ...` (yang secara teknis
-- menganggap SEMUA angka bukan-nol, termasuk hipotetis negatif, sebagai
-- valid). Ini SENGAJA diterapkan di sini juga (bukan hanya di RPC
-- all-time) supaya StatCard "all-time" dan StatCard "bulan ini" di
-- halaman yang SAMA (ProduksiLaporanPage) memakai definisi effective_hpp
-- yang IDENTIK — sebelum perbaikan ini, keduanya akan memakai 2 business
-- rule berbeda untuk konsep yang sama persis, kalau tidak disamakan.
--
-- ────────────────────────────────────────────────────────────
-- BATAS SCOPE (disengaja, diungkap eksplisit)
-- ────────────────────────────────────────────────────────────
-- `totalTagihan` (SUM tagihan.total_harga) TIDAK ikut dipindahkan ke
-- RPC ini. Sumber datanya (`bahan_pembelian`/`bahan_pinjam`, difilter
-- oleh `jatuh_tempo`, BUKAN `tanggal_produksi`) sepenuhnya independen
-- dari `produksi_batch`/`hpp_template`/`products` yang jadi scope RPC
-- ini, dan diambil lewat fungsi terpisah (`fetchTagihanJatuhTempo`,
-- TIDAK disentuh migration ini). Menggabungkan keduanya ke 1 RPC akan
-- mencampur 2 domain data yang secara konsep berbeda (produksi vs
-- utang bahan) hanya karena kebetulan ditampilkan di halaman yang sama
-- — di luar scope "migrasikan fetchProduksiBatches". totalTagihan tetap
-- dihitung di JS lewat fungsi kecil `calcTotalTagihan()` (1 baris
-- reduce, di utils.js) — SATU-SATUNYA business math yang tersisa di
-- frontend untuk fitur laporan produksi setelah migration ini.
--
-- ────────────────────────────────────────────────────────────
-- Edge case & perilaku yang direplikasi/didokumentasikan
-- ────────────────────────────────────────────────────────────
--   - Filter tanggal: tanggal_produksi BETWEEN p_from_date AND p_to_date
--     (inclusive kedua ujung, sama seperti .gte()+.lte() lama).
--   - Urutan batches: ORDER BY tanggal_produksi ASC (sama seperti
--     .order("tanggal_produksi") lama). Urutan SEKUNDER untuk batch
--     dengan tanggal SAMA PERSIS tidak dijamin identik dengan versi
--     lama (keduanya sama-sama tidak punya secondary sort key) — beda
--     yang sangat kecil/tidak berdampak praktis, diungkap di laporan.
--   - Tidak ada pengecekan `error` dari RPC (sama seperti versi lama
--     yang tidak pernah mengecek `error` dari ketiga query manapun) —
--     kegagalan diam-diam menghasilkan hasil kosong di sisi client
--     (lihat perubahan api.js).
--   - Rounding `bahan_dipakai[].jumlah`: ROUND(numeric, 2) — setara
--     dengan Math.round(x*100)/100 untuk domain angka non-negatif di
--     bisnis ini (round-half-away-from-zero, bukan banker's rounding).
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lain, tidak membuat tabel/kolom/constraint/
-- trigger/view/generated column/index baru, tidak mengimplementasikan
-- RPC lain (fetchTagihanJatuhTempo TIDAK ikut dimigrasikan di sini).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_laporan_produksi(
  p_from_date date,
  p_to_date date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      pb.*,
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
    WHERE pb.tanggal_produksi >= p_from_date
      AND pb.tanggal_produksi <= p_to_date
  ),
  batches_json AS (
    SELECT jsonb_agg(
      (to_jsonb(b) - 'effective_hpp' - 'effective_bahan_dipakai' - 'effective_harga_jual')
      || jsonb_build_object(
        'hpp_per_item', b.effective_hpp,
        'bahan_dipakai', b.effective_bahan_dipakai,
        'harga_jual', b.effective_harga_jual,
        'modal', b.effective_hpp * COALESCE(b.total_kain, 0)
      )
      ORDER BY b.tanggal_produksi ASC
    ) AS batches
    FROM base b
  ),
  bahan_usage AS (
    SELECT jsonb_agg(
      jsonb_build_object('nama', nama_bahan, 'satuan', satuan, 'jumlah', jumlah)
      ORDER BY jumlah DESC
    ) AS bahan_usage
    FROM (
      SELECT
        bh ->> 'nama_bahan' AS nama_bahan,
        bh ->> 'satuan' AS satuan,
        SUM(COALESCE((bh ->> 'jumlah')::numeric, 0)) AS jumlah
      FROM base b, jsonb_array_elements(b.effective_bahan_dipakai) bh
      GROUP BY bh ->> 'nama_bahan', bh ->> 'satuan'
    ) grouped
  )
  SELECT jsonb_build_object(
    'batches', COALESCE((SELECT batches FROM batches_json), '[]'::jsonb),
    'ringkasan', jsonb_build_object(
      'totalBatch', (SELECT COUNT(*) FROM base),
      'totalBaju', (SELECT COALESCE(SUM(COALESCE(total_kain, 0)), 0) FROM base),
      'totalModal', (SELECT COALESCE(SUM(effective_hpp * COALESCE(total_kain, 0)), 0) FROM base),
      'hppAvg', (SELECT COALESCE(ROUND(AVG(effective_hpp)), 0)::int FROM base WHERE effective_hpp > 0),
      'hargaJualAvg', (SELECT COALESCE(ROUND(AVG(effective_harga_jual)), 0)::int FROM base WHERE effective_harga_jual > 0)
    ),
    'bahanUsage', COALESCE((SELECT bahan_usage FROM bahan_usage), '[]'::jsonb)
  );
$$;

-- Sama seperti RLS SELECT produksi_batch/hpp_template/products yang
-- sudah mengizinkan role authenticated — RPC ini dipakai halaman Admin
-- (Laporan Produksi), grant dibatasi ke situ.
GRANT EXECUTE ON FUNCTION public.get_laporan_produksi(date, date) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_laporan_produksi';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_laporan_produksi';
--
-- Panggil untuk 1 bulan & cek strukturnya:
-- SELECT public.get_laporan_produksi('2026-07-01', '2026-07-31');
-- SELECT jsonb_pretty(public.get_laporan_produksi('2026-07-01', '2026-07-31') -> 'ringkasan');
