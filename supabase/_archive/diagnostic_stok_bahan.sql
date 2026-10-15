-- ============================================================
-- DIAGNOSTIC: Cek kenapa stok bahan tidak berkurang
-- Jalankan satu per satu di Supabase SQL Editor
-- ============================================================

-- ── 1. Cek isi bahan_dipakai di batch produksi ──────────────
-- Kalau kolom bahan_dipakai kosong ([]) di semua batch,
-- berarti batch dibuat sebelum HPP template ada.
SELECT
  batch_no,
  kode_produk,
  total_kain,
  jsonb_array_length(bahan_dipakai) AS jumlah_bahan,
  bahan_dipakai
FROM produksi_batch
ORDER BY created_at DESC
LIMIT 10;

-- ── 2. Cek isi v_stok_bahan ──────────────────────────────────
-- Kalau total_keluar = 0 tapi jumlah_bahan di atas > 0,
-- berarti ada masalah nama_bahan / satuan tidak cocok.
SELECT * FROM v_stok_bahan ORDER BY nama_bahan;

-- ── 3. Cek nama_bahan & satuan di bahan_dipakai vs bahan_pembelian
-- Keduanya HARUS sama persis (case-sensitive).
SELECT DISTINCT
  item->>'nama_bahan' AS nama_batch,
  item->>'satuan'     AS satuan_batch
FROM produksi_batch,
     jsonb_array_elements(bahan_dipakai) AS item
ORDER BY 1;

SELECT DISTINCT nama_bahan, satuan FROM bahan_pembelian ORDER BY 1;
SELECT DISTINCT nama_bahan, satuan FROM bahan_pinjam ORDER BY 1;

-- ── 4. Cek apakah kolom arah_pinjam sudah ada ────────────────
-- Kalau error "column does not exist", migration 20260526 belum dijalankan.
SELECT DISTINCT arah_pinjam FROM bahan_pinjam;

-- ── 5. Paksa update view (jalankan kalau migrasi 20260526 sudah diapply) ──
-- Ini memastikan view pakai versi terbaru.
CREATE OR REPLACE VIEW v_stok_bahan AS
SELECT
  nama_bahan,
  satuan,
  COALESCE(masuk, 0)   AS total_masuk,
  COALESCE(keluar, 0)  AS total_keluar,
  COALESCE(masuk, 0) - COALESCE(keluar, 0) AS stok_sisa
FROM (
  SELECT nama_bahan, satuan, SUM(jumlah) AS masuk
  FROM (
    SELECT nama_bahan, satuan, jumlah FROM bahan_pembelian
    UNION ALL
    SELECT nama_bahan, satuan, jumlah
      FROM bahan_pinjam WHERE arah_pinjam = 'masuk'
  ) all_masuk
  GROUP BY nama_bahan, satuan
) masuk_tbl
LEFT JOIN (
  SELECT nama_bahan, satuan, SUM(jumlah) AS keluar
  FROM (
    SELECT
      item->>'nama_bahan' AS nama_bahan,
      item->>'satuan'     AS satuan,
      (item->>'jumlah')::numeric AS jumlah
    FROM produksi_batch,
         jsonb_array_elements(bahan_dipakai) AS item
    UNION ALL
    SELECT nama_bahan, satuan, jumlah
      FROM bahan_pinjam WHERE arah_pinjam = 'keluar'
  ) all_keluar
  GROUP BY nama_bahan, satuan
) keluar_tbl USING (nama_bahan, satuan);
