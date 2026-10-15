-- ============================================================
-- Migration Phase 1 — RPC get_produksi_batches_total()
--
-- REVISI: fungsi ini awalnya ditulis untuk mengembalikan ARRAY batch
-- (mereplikasi 1:1 perilaku lama, termasuk bug lama di hooks.js yang
-- mengabaikan fallback template HPP) supaya frontend tidak perlu
-- diubah sama sekali. Setelah review arsitektur, keputusan itu DIBALIK:
-- target arsitektur project ini adalah "PostgreSQL = seluruh business
-- logic, frontend = presentation layer" — jadi CTE/agregasi (SUM,
-- COUNT, fallback HPP) yang sebelumnya sengaja dibiarkan tetap di JS
-- (hooks.js) sekarang DIPINDAHKAN ke RPC ini, dan hooks.js disederhanakan
-- jadi pass-through murni. Revisi ini SEKALIGUS memperbaiki bug lama
-- (lihat "PERBAIKAN BUG" di bawah) yang pada versi pertama migration ini
-- sengaja TIDAK diperbaiki (hanya dilaporkan).
--
-- Tujuan: RPC ini langsung mengembalikan statistik all-time siap pakai
-- — { totalBatch, totalBaju, totalModal } — bukan lagi array baris
-- mentah. Frontend (fetchProduksiBatchesTotal di api.js, dan
-- useProduksiBatchesTotal di hooks.js) tidak lagi melakukan reduce/
-- SUM/COUNT/perkalian/fallback HPP apa pun — murni meneruskan hasil RPC.
--
-- ────────────────────────────────────────────────────────────
-- PERBAIKAN BUG (business rule yang benar, DISENGAJA berbeda dari
-- perilaku lama — lihat laporan migration untuk detail penuh)
-- ────────────────────────────────────────────────────────────
-- Versi lama (baik kode JS asli maupun revisi pertama RPC ini) menghitung
-- totalModal dari `hpp_per_item` MENTAH tanpa fallback ke Template HPP,
-- meski field enrichment `hpp_total` sempat dihitung (di revisi pertama
-- RPC ini) — nilai itu tidak pernah dipakai oleh hooks.js. Revisi ini
-- BENAR-BENAR memperbaikinya: totalModal sekarang dihitung dari
-- `effective_hpp` yang sudah fallback ke Template HPP, sesuai definisi:
--
--   effective_hpp =
--     IF hpp_per_item IS NOT NULL AND hpp_per_item > 0
--     THEN hpp_per_item
--     ELSE COALESCE(hpp_template.total_hpp, 0)
--
--   totalModal = SUM(effective_hpp * total_kain)
--
-- Catatan perbedaan dari truthiness JS lama (`b.hpp_per_item ?`): versi
-- lama menganggap SEMUA angka bukan-nol (termasuk negatif, kalaupun ada)
-- sebagai "valid, jangan fallback". Business rule baru ini eksplisit
-- mensyaratkan `hpp_per_item > 0` — kalau ada baris hpp_per_item negatif
-- (seharusnya tidak pernah terjadi secara bisnis), sekarang JUSTRU
-- fallback ke Template HPP alih-alih dipakai apa adanya. Perbedaan ini
-- disengaja mengikuti instruksi eksplisit definisi effective_hpp di atas.
--
-- ────────────────────────────────────────────────────────────
-- PERUBAHAN LAIN vs revisi pertama migration ini
-- ────────────────────────────────────────────────────────────
--   - `LIMIT 10000` (dahulu meniru `.range(0,9999)` versi JS lama, murni
--     workaround pembatasan payload client) DIHAPUS. Alasan: sekarang
--     TIDAK ADA lagi array baris yang dikirim ke client — hanya 3 angka
--     hasil SUM/COUNT — sehingga tidak ada lagi justifikasi teknis untuk
--     membatasi jumlah baris yang dipindai. Mempertahankan batas ini
--     justru akan membuat "business rule yang benar" jadi TIDAK BENAR
--     untuk toko yang sudah punya lebih dari 10.000 batch produksi
--     (statistik all-time akan diam-diam tidak lengkap). Ini adalah
--     perubahan perilaku yang DISENGAJA & diungkapkan eksplisit di
--     laporan migration (bukan dilakukan diam-diam).
--   - Return type tetap `jsonb`, tapi bentuknya sekarang OBJECT
--     `{totalBatch, totalBaju, totalModal}`, BUKAN ARRAY.
--
-- Business logic yang TETAP direplikasi sama:
--   - Sumber data: SELURUH tabel produksi_batch, TANPA filter tanggal
--     (all-time), LEFT JOIN ke hpp_template by kode_produk (kode_produk
--     NULL -> tidak match apa pun -> effective_hpp jatuh ke 0, sama
--     seperti sebelumnya).
--   - totalBatch = COUNT(*) atas seluruh baris produksi_batch (LEFT JOIN
--     ke hpp_template via kolom UNIQUE tidak menggandakan baris, jadi
--     COUNT setelah JOIN = COUNT baris produksi_batch asli).
--   - totalBaju = SUM(total_kain), fallback NULL -> 0 per baris (COALESCE).
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lain, tidak membuat tabel/kolom/constraint/
-- trigger/view/generated column/index baru, tidak mengimplementasikan
-- RPC lain (fetchProduksiBatches() TIDAK ikut dimigrasikan di sini).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_produksi_batches_total()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalBatch', COUNT(*),
    'totalBaju', COALESCE(SUM(COALESCE(pb.total_kain, 0)), 0),
    'totalModal', COALESCE(
      SUM(
        (
          CASE
            WHEN pb.hpp_per_item IS NOT NULL AND pb.hpp_per_item > 0
              THEN pb.hpp_per_item
            ELSE COALESCE(tpl.total_hpp, 0)
          END
        ) * COALESCE(pb.total_kain, 0)
      ),
      0
    )
  )
  FROM produksi_batch pb
  LEFT JOIN hpp_template tpl ON tpl.kode_produk = pb.kode_produk;
$$;

-- Sama seperti RLS SELECT `produksi_batch`/`hpp_template` yang sudah
-- mengizinkan role authenticated — RPC ini dipakai halaman Admin
-- (Laporan Produksi), grant dibatasi ke situ.
GRANT EXECUTE ON FUNCTION public.get_produksi_batches_total() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_produksi_batches_total';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_produksi_batches_total';
--
-- Panggil & bandingkan manual:
-- SELECT public.get_produksi_batches_total();
--
-- SELECT
--   count(*) AS total_batch,
--   COALESCE(SUM(COALESCE(pb.total_kain,0)),0) AS total_baju,
--   COALESCE(SUM(
--     (CASE WHEN pb.hpp_per_item IS NOT NULL AND pb.hpp_per_item > 0
--           THEN pb.hpp_per_item ELSE COALESCE(tpl.total_hpp,0) END)
--     * COALESCE(pb.total_kain,0)
--   ),0) AS total_modal
-- FROM produksi_batch pb
-- LEFT JOIN hpp_template tpl ON tpl.kode_produk = pb.kode_produk;
