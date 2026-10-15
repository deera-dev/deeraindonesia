-- Fitur: cari tahu tukang jahit mana yang mengerjakan produk apa, dan
-- menghindari input upah jahit berulang di Finance.
--
-- 1) upah_jahit di produksi_batch — field BARU, SENGAJA terpisah dari
--    hpp_template.upah_jahit (itu komponen kalkulasi HPP/harga pokok,
--    beda konsep/beda siklus hidup dari "berapa upah tukang jahit per
--    pcs utk batch produksi ini" yang diminta di sini — konfirmasi
--    eksplisit Denny). Diisi saat "Buat Produksi" (produksi-record),
--    dibaca oleh apps/finance utk auto-isi "Upah / pcs" di form Tim
--    Jahit (JahitForm) berdasarkan batch TERBARU utk kode itu.
ALTER TABLE produksi_batch ADD COLUMN IF NOT EXISTS upah_jahit integer DEFAULT 0;

-- 2) kode_produk di gaji_qc — QC saat ini pilih produk by nama_produk
--    (text bebas), padahal nama produk bisa sama utk kode berbeda.
--    Tambah kolom kode_produk sbg kunci seleksi yang benar; nama_produk
--    tetap ada (auto-derived dari kode saat form disubmit) utk display
--    backward-compatible di kartu/rincian yang sudah ada.
ALTER TABLE gaji_qc ADD COLUMN IF NOT EXISTS kode_produk text;

-- (gaji_finishing.items sudah jsonb bebas skema — kode_produk ditambah
--  di level aplikasi tanpa perlu migrasi kolom, cukup key baru di jsonb.)

-- 3) View agregat "berapa yang sudah dikerjakan Tim Jahit" per
--    kode+ukuran+warna, ALL-TIME (semua periode gajian, bukan cuma yang
--    draft) — dibaca dari Stok Opname (admin) sbg info pembanding saat
--    input stok aktual, TIDAK mengubah cara input stok (tetap manual).
--    kartu_items: [{kode, warna, ukuran, jumlah, upah}] — warna "" (form
--    Jahit, produk tanpa varian warna) dinormalisasi ke "_" supaya cocok
--    dengan konvensi stok_warna.warna.
CREATE OR REPLACE VIEW v_jahit_dikerjakan AS
SELECT
  item->>'kode' AS kode,
  item->>'ukuran' AS size,
  COALESCE(NULLIF(item->>'warna', ''), '_') AS warna,
  SUM(COALESCE((item->>'jumlah')::numeric, 0))::integer AS total_dikerjakan
FROM gaji_jahit, jsonb_array_elements(kartu_items) AS item
WHERE item->>'kode' IS NOT NULL AND item->>'kode' <> ''
GROUP BY item->>'kode', item->>'ukuran', COALESCE(NULLIF(item->>'warna', ''), '_');

NOTIFY pgrst, 'reload schema';
