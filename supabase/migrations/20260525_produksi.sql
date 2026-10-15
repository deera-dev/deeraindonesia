-- ============================================================
-- Migration: Modul Produksi
-- Tanggal: 2026-05-25
-- Deskripsi: Tabel-tabel untuk manajemen produksi Deera Indonesia
--   - bahan_pembelian  : catatan pembelian bahan baku
--   - bahan_pinjam     : catatan bahan pinjam (dikembalikan uang)
--   - produksi_batch   : catatan batch produksi
--   - hpp_config       : konfigurasi harga dasar komponen HPP
-- ============================================================

-- ── 1. Tabel bahan_pembelian ─────────────────────────────────
CREATE TABLE bahan_pembelian (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         date        NOT NULL,
  nama_bahan      text        NOT NULL,
  kode_bahan      text,                           -- kode internal (opsional)
  motif           text,                           -- motif/corak (opsional)
  satuan          text        NOT NULL DEFAULT 'meter',  -- meter | yard | cm
  jumlah          numeric     NOT NULL,           -- qty dibeli
  harga_satuan    integer     NOT NULL DEFAULT 0, -- harga per satuan (IDR)
  total_harga     integer     NOT NULL DEFAULT 0, -- jumlah × harga_satuan
  jatuh_tempo     date        NOT NULL,           -- 4 bulan setelah tanggal
  status_bayar    text        NOT NULL DEFAULT 'belum', -- belum | lunas
  catatan         text,
  created_by      text,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bahan_pembelian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produksi_bahan_pembelian_select" ON bahan_pembelian FOR SELECT TO authenticated USING (true);
CREATE POLICY "produksi_bahan_pembelian_insert" ON bahan_pembelian FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "produksi_bahan_pembelian_update" ON bahan_pembelian FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "produksi_bahan_pembelian_delete" ON bahan_pembelian FOR DELETE TO authenticated USING (true);

CREATE INDEX bahan_pembelian_tanggal_idx       ON bahan_pembelian (tanggal DESC);
CREATE INDEX bahan_pembelian_jatuh_tempo_idx   ON bahan_pembelian (jatuh_tempo ASC);
CREATE INDEX bahan_pembelian_status_bayar_idx  ON bahan_pembelian (status_bayar);
CREATE INDEX bahan_pembelian_nama_idx          ON bahan_pembelian (nama_bahan);

-- ── 2. Tabel bahan_pinjam ────────────────────────────────────
CREATE TABLE bahan_pinjam (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         date        NOT NULL,
  dari_siapa      text        NOT NULL,           -- nama supplier / pemberi pinjaman
  nama_bahan      text        NOT NULL,
  kode_bahan      text,
  motif           text,
  satuan          text        NOT NULL DEFAULT 'meter',
  jumlah          numeric     NOT NULL,
  harga_satuan    integer     NOT NULL DEFAULT 0,
  total_harga     integer     NOT NULL DEFAULT 0,
  jatuh_tempo     date        NOT NULL,           -- 4 bulan setelah tanggal
  status_bayar    text        NOT NULL DEFAULT 'belum', -- belum | lunas
  catatan         text,
  created_by      text,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bahan_pinjam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produksi_bahan_pinjam_select" ON bahan_pinjam FOR SELECT TO authenticated USING (true);
CREATE POLICY "produksi_bahan_pinjam_insert" ON bahan_pinjam FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "produksi_bahan_pinjam_update" ON bahan_pinjam FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "produksi_bahan_pinjam_delete" ON bahan_pinjam FOR DELETE TO authenticated USING (true);

CREATE INDEX bahan_pinjam_tanggal_idx      ON bahan_pinjam (tanggal DESC);
CREATE INDEX bahan_pinjam_jatuh_tempo_idx  ON bahan_pinjam (jatuh_tempo ASC);
CREATE INDEX bahan_pinjam_status_bayar_idx ON bahan_pinjam (status_bayar);
CREATE INDEX bahan_pinjam_dari_siapa_idx   ON bahan_pinjam (dari_siapa);

-- ── 3. Tabel produksi_batch ──────────────────────────────────
CREATE TABLE produksi_batch (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no         text        NOT NULL,          -- format: PROD-YYYYMMDD-XXX
  kode_produk      text        NOT NULL REFERENCES products(kode) ON UPDATE CASCADE,
  nama_produk      text,
  tanggal_produksi date        NOT NULL,
  total_kain       integer     NOT NULL DEFAULT 0, -- total pakaian diproduksi

  -- Rincian ukuran: [{size, qty, warna: [{warna, qty}]}]
  sizes            jsonb       NOT NULL DEFAULT '[]',

  -- Bahan yang dipakai: [{nama_bahan, kode_bahan, satuan, jumlah}]
  bahan_dipakai    jsonb       NOT NULL DEFAULT '[]',

  -- HPP
  hpp_snapshot     jsonb,                          -- snapshot komponen HPP saat produksi
  hpp_per_item     integer     DEFAULT 0,          -- HPP per pakaian (IDR)

  -- Status penambahan stok
  stok_ditambah    boolean     NOT NULL DEFAULT false,
  stok_lokasi      text,                           -- gudang | cideng | tegalgubug

  catatan          text,
  created_by       text,
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE produksi_batch ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produksi_batch_select" ON produksi_batch FOR SELECT TO authenticated USING (true);
CREATE POLICY "produksi_batch_insert" ON produksi_batch FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "produksi_batch_update" ON produksi_batch FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "produksi_batch_delete" ON produksi_batch FOR DELETE TO authenticated USING (true);

CREATE INDEX produksi_batch_tanggal_idx     ON produksi_batch (tanggal_produksi DESC);
CREATE INDEX produksi_batch_kode_produk_idx ON produksi_batch (kode_produk);
CREATE UNIQUE INDEX produksi_batch_no_idx   ON produksi_batch (batch_no);

-- ── 4. Tabel hpp_config ──────────────────────────────────────
-- Harga dasar komponen HPP, bisa diubah oleh admin
CREATE TABLE hpp_config (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  label      text        NOT NULL,
  nilai      integer     NOT NULL DEFAULT 0,
  keterangan text,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

ALTER TABLE hpp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hpp_config_select" ON hpp_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "hpp_config_update" ON hpp_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed nilai default HPP
INSERT INTO hpp_config (key, label, nilai, keterangan) VALUES
  ('bordir',         'Bordir',              10000, 'Biaya bordir per pakaian'),
  ('jahit_midi',     'Jahit (Midi)',         35000, 'Ongkos jahit ukuran Midi & Midi Jumbo'),
  ('jahit_gamis',    'Jahit (Gamis)',        45000, 'Ongkos jahit ukuran Gamis & Gamis Jumbo'),
  ('plastik',        'Plastik',              1800, 'Biaya plastik kemasan per pakaian'),
  ('hangtag',        'Hangtag',               200, 'Biaya hangtag per pakaian'),
  ('tali_hangtag',   'Tali Hangtag',          100, 'Biaya tali hangtag per pakaian'),
  ('merk',           'Merk',                  200, 'Biaya label merk per pakaian'),
  ('pin',            'Pin',                  2800, 'Biaya pin per pakaian'),
  ('kain_keras',     'Kain Keras',            200, 'Biaya kain keras per pakaian'),
  ('kancing_satuan', 'Kancing (per biji)',    500, 'Harga kancing per biji'),
  ('studio',         'Studio Foto',        165000, 'Biaya studio foto per sesi (dibagi total kain)'),
  ('poin_denny',     'Poin Denny',          10000, 'Poin komisi Denny per pakaian'),
  ('poin_haikal',    'Poin Haikal',         10000, 'Poin komisi Haikal per pakaian');

-- ── 5. View: stok_bahan ──────────────────────────────────────
-- Stok bahan dihitung otomatis dari pembelian + pinjam - pemakaian produksi
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
    SELECT nama_bahan, satuan, jumlah FROM bahan_pinjam
  ) all_masuk
  GROUP BY nama_bahan, satuan
) masuk_tbl
LEFT JOIN (
  SELECT
    item->>'nama_bahan' AS nama_bahan,
    item->>'satuan'     AS satuan,
    SUM((item->>'jumlah')::numeric) AS keluar
  FROM produksi_batch,
       jsonb_array_elements(bahan_dipakai) AS item
  GROUP BY item->>'nama_bahan', item->>'satuan'
) keluar_tbl USING (nama_bahan, satuan);
