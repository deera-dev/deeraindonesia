-- ============================================================
-- Migration: Bahan Updates
-- Tanggal: 2026-05-26
-- 1. Tambah kolom arah_pinjam ke bahan_pinjam
--    'masuk'  = Deera menerima bahan dari pihak lain
--    'keluar' = Deera meminjamkan bahan ke pihak lain
-- 2. Tambah kolom foto_url ke bahan_pembelian dan bahan_pinjam
-- 3. Update view v_stok_bahan untuk memperhitungkan arah_pinjam
-- 4. Tambah kolom nama_pemberi dan nama_peminjam ke bahan_pinjam
--    (jika belum ada — menggunakan IF NOT EXISTS workaround)
-- ============================================================

-- ── 1. Kolom arah_pinjam ─────────────────────────────────────
ALTER TABLE bahan_pinjam
  ADD COLUMN IF NOT EXISTS arah_pinjam text NOT NULL DEFAULT 'masuk'
    CHECK (arah_pinjam IN ('masuk', 'keluar'));

-- Record lama dianggap masuk (Deera menerima), sudah di-handle oleh DEFAULT

-- ── 2. Kolom nama_pemberi & nama_peminjam (jika belum ada) ───
-- Tabel sudah menggunakan nama_pemberi (bukan dari_siapa)
ALTER TABLE bahan_pinjam
  ADD COLUMN IF NOT EXISTS nama_pemberi text;

ALTER TABLE bahan_pinjam
  ADD COLUMN IF NOT EXISTS nama_peminjam text;

-- ── 3. Kolom jatuh_tempo di bahan_pinjam (jika belum ada) ────
ALTER TABLE bahan_pinjam
  ADD COLUMN IF NOT EXISTS jatuh_tempo date;

-- Default: 4 bulan dari tanggal untuk record tanpa jatuh_tempo
UPDATE bahan_pinjam
  SET jatuh_tempo = (tanggal + INTERVAL '4 months')::date
  WHERE jatuh_tempo IS NULL;

-- ── 4. Kolom foto_url ─────────────────────────────────────────
ALTER TABLE bahan_pembelian
  ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE bahan_pinjam
  ADD COLUMN IF NOT EXISTS foto_url text;

-- ── 5. Update view v_stok_bahan ──────────────────────────────
-- masuk  = bahan_pembelian + bahan_pinjam WHERE arah_pinjam = 'masuk'
-- keluar = produksi_batch.bahan_dipakai + bahan_pinjam WHERE arah_pinjam = 'keluar'
CREATE OR REPLACE VIEW v_stok_bahan AS
SELECT
  nama_bahan,
  satuan,
  COALESCE(masuk, 0)   AS total_masuk,
  COALESCE(keluar, 0)  AS total_keluar,
  COALESCE(masuk, 0) - COALESCE(keluar, 0) AS stok_sisa
FROM (
  SELECT nama_bahan, satuan,
         SUM(jumlah) AS masuk
  FROM (
    SELECT nama_bahan, satuan, jumlah FROM bahan_pembelian
    UNION ALL
    SELECT nama_bahan, satuan, jumlah
      FROM bahan_pinjam
      WHERE arah_pinjam = 'masuk'
  ) all_masuk
  GROUP BY nama_bahan, satuan
) masuk_tbl
LEFT JOIN (
  SELECT nama_bahan, satuan,
         SUM(jumlah) AS keluar
  FROM (
    -- Pemakaian produksi
    SELECT
      item->>'nama_bahan' AS nama_bahan,
      item->>'satuan'     AS satuan,
      (item->>'jumlah')::numeric AS jumlah
    FROM produksi_batch,
         jsonb_array_elements(bahan_dipakai) AS item
    UNION ALL
    -- Bahan pinjam yang Deera keluarkan / pinjamkan ke pihak lain
    SELECT nama_bahan, satuan, jumlah
      FROM bahan_pinjam
      WHERE arah_pinjam = 'keluar'
  ) all_keluar
  GROUP BY nama_bahan, satuan
) keluar_tbl USING (nama_bahan, satuan);

