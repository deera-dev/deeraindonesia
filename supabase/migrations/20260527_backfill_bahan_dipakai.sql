-- ============================================================
-- Migration: Backfill bahan_dipakai di produksi_batch
-- Tanggal: 2026-05-27
--
-- Masalah: batch yang dibuat sebelum HPP template tersimpan
--          punya bahan_dipakai = [] → stok tidak berkurang.
--
-- Fix: isi bahan_dipakai dari hpp_template.bahan_items × total_kain
--      untuk semua batch yang bahan_dipakai-nya masih kosong
--      DAN ada HPP template yang matching.
-- ============================================================

UPDATE produksi_batch pb
SET
  bahan_dipakai = sub.bahan_list,
  hpp_snapshot  = sub.tpl_snapshot
FROM (
  SELECT
    pb2.id,
    jsonb_agg(
      jsonb_build_object(
        'nama_bahan', item->>'nama_bahan',
        'kode_bahan', COALESCE(item->>'kode_bahan', ''),
        'satuan',     item->>'satuan',
        'jumlah',     ROUND(
                        CAST(item->>'qty_per_baju' AS numeric) * pb2.total_kain,
                        2
                      )
      )
    ) FILTER (
      WHERE (item->>'qty_per_baju') IS NOT NULL
        AND CAST(item->>'qty_per_baju' AS numeric) > 0
    ) AS bahan_list,
    to_jsonb(ht.*) AS tpl_snapshot
  FROM produksi_batch pb2
  JOIN hpp_template ht ON ht.kode_produk = pb2.kode_produk
  CROSS JOIN LATERAL jsonb_array_elements(ht.bahan_items) AS item
  WHERE
    -- Hanya batch yang bahan_dipakai masih kosong
    (pb2.bahan_dipakai IS NULL OR jsonb_array_length(pb2.bahan_dipakai) = 0)
    -- HPP template harus punya bahan
    AND jsonb_array_length(ht.bahan_items) > 0
  GROUP BY pb2.id, ht.id
) sub
WHERE pb.id = sub.id;

-- Verifikasi setelah update
SELECT
  batch_no,
  kode_produk,
  total_kain,
  jsonb_array_length(bahan_dipakai) AS jumlah_bahan_dipakai,
  bahan_dipakai
FROM produksi_batch
ORDER BY created_at DESC;
