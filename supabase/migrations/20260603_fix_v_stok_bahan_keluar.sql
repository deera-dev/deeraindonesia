-- ============================================================
-- Fix: v_stok_bahan total_keluar selalu 0
-- Penyebab: produksi_batch.bahan_dipakai kosong ([]) untuk
--           batch yang dibuat sebelum field ini diisi otomatis.
-- Solusi:
--   1. Backfill bahan_dipakai dari hpp_template.bahan_items × total_kain
--      untuk semua batch yang bahan_dipakai masih kosong.
--   2. Recreate view v_stok_bahan (sudah benar, tapi pastikan fresh).
-- ============================================================

-- ── 1. Backfill bahan_dipakai ─────────────────────────────────
-- Isi dari hpp_template.bahan_items × total_kain
-- Hanya batch yang bahan_dipakai masih [] atau null
UPDATE produksi_batch pb
SET bahan_dipakai = sub.bahan_list
FROM (
  SELECT
    pb2.id,
    jsonb_agg(
      jsonb_build_object(
        'nama_bahan', item->>'nama_bahan',
        'kode_bahan', item->>'kode_bahan',
        'satuan',     item->>'satuan',
        'jumlah',     ROUND(
                        ((item->>'qty_per_baju')::numeric * pb2.total_kain)::numeric,
                        4
                      )
      )
    ) AS bahan_list
  FROM produksi_batch pb2
  JOIN hpp_template ht ON ht.kode_produk = pb2.kode_produk
  CROSS JOIN LATERAL jsonb_array_elements(ht.bahan_items) AS item
  WHERE
    -- hanya batch yang belum ada bahan_dipakai
    (pb2.bahan_dipakai IS NULL OR jsonb_array_length(pb2.bahan_dipakai) = 0)
    -- hanya jika ada qty_per_baju yang valid
    AND (item->>'qty_per_baju') IS NOT NULL
    AND (item->>'qty_per_baju')::numeric > 0
    AND pb2.total_kain > 0
  GROUP BY pb2.id
) sub
WHERE pb.id = sub.id;

-- ── 2. Refresh view v_stok_bahan ─────────────────────────────
-- (view sudah benar dari migration sebelumnya, tapi recreate untuk memastikan)
CREATE OR REPLACE VIEW v_stok_bahan AS
SELECT
  nama_bahan,
  satuan,
  COALESCE(masuk, 0)                        AS total_masuk,
  COALESCE(keluar, 0)                       AS total_keluar,
  COALESCE(masuk, 0) - COALESCE(keluar, 0) AS stok_sisa
FROM (
  SELECT nama_bahan, satuan, SUM(jumlah) AS masuk
  FROM (
    SELECT nama_bahan, satuan, jumlah FROM bahan_pembelian
    UNION ALL
    SELECT nama_bahan, satuan, jumlah FROM bahan_pinjam WHERE arah_pinjam = 'masuk'
  ) all_masuk
  GROUP BY nama_bahan, satuan
) masuk_tbl
LEFT JOIN (
  SELECT nama_bahan, satuan, SUM(jumlah) AS keluar
  FROM (
    SELECT
      item->>'nama_bahan'        AS nama_bahan,
      item->>'satuan'            AS satuan,
      (item->>'jumlah')::numeric AS jumlah
    FROM produksi_batch,
         jsonb_array_elements(bahan_dipakai) AS item
    WHERE jsonb_array_length(bahan_dipakai) > 0
    UNION ALL
    SELECT nama_bahan, satuan, jumlah FROM bahan_pinjam WHERE arah_pinjam = 'keluar'
  ) all_keluar
  GROUP BY nama_bahan, satuan
) keluar_tbl USING (nama_bahan, satuan);
