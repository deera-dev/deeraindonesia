-- ── CMT follow-up (koreksi dari review Denny) ─────────────────────────────
--
-- 1. CMT Jahit: "Produk yang dikirim" TIDAK boleh minta admin pilih warna +
--    ketik qty manual lagi -- semua warna & qty wajib ikut apa yang sudah
--    ada di buku potongan (jahit_cards dari batch produksi kode itu).
--    Begitu kartu-kartu itu dipakai utk suatu kirim CMT, ditandai
--    `cmt_jahit_kirim_id` supaya TIDAK dobel-kehitung sbg "kartu internal
--    pending" di rekonsiliasi Finishing (apps/finance/src/features/gajian)
--    -- tanpa ini, barang yang sudah dikirim ke vendor luar bisa salah
--    diserap sbg stok lewat jalur kartu internal padahal belum disetor.
ALTER TABLE jahit_cards
  ADD COLUMN cmt_jahit_kirim_id uuid REFERENCES cmt_jahit_kirim(id) ON DELETE SET NULL;

CREATE INDEX idx_jahit_cards_cmt_jahit_kirim_id ON jahit_cards(cmt_jahit_kirim_id);

-- 2. CMT Full: tahap "Kirim Bahan" (bahan mentah ke vendor, SEBELUM ada
--    kode produk -- kode/breakdown baru diisi nanti pas mereka setor
--    barang jadi, lihat cmt_setoran_full yang sudah ada). Satu baris =
--    satu kali kirim, bisa banyak bahan sekaligus (jsonb array, sama
--    bentuknya dgn produksi_batch.bahan_dipakai).
CREATE TABLE cmt_full_kirim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_vendor text NOT NULL,
  tanggal_kirim date NOT NULL,
  estimasi_selesai date,
  bahan jsonb NOT NULL DEFAULT '[]'::jsonb,
  catatan text,
  created_by text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cmt_full_kirim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmt_full_kirim_select" ON cmt_full_kirim FOR SELECT TO authenticated USING (true);
CREATE POLICY "cmt_full_kirim_insert" ON cmt_full_kirim FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cmt_full_kirim_update" ON cmt_full_kirim FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cmt_full_kirim_delete" ON cmt_full_kirim FOR DELETE TO authenticated USING (true);

-- Bahan yang dikirim ke vendor CMT Full ikut terhitung "keluar" di
-- v_stok_bahan (paralel produksi_batch.bahan_dipakai & bahan_pinjam
-- arah_pinjam='keluar' yang sudah ada).
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
    UNION ALL
    SELECT
      item->>'nama_bahan'        AS nama_bahan,
      item->>'satuan'            AS satuan,
      (item->>'jumlah')::numeric AS jumlah
    FROM cmt_full_kirim,
         jsonb_array_elements(bahan) AS item
    WHERE jsonb_array_length(bahan) > 0
  ) all_keluar
  GROUP BY nama_bahan, satuan
) keluar_tbl USING (nama_bahan, satuan);
