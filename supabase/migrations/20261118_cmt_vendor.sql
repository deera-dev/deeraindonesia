-- ── Fitur CMT (Cut-Make-Trim / vendor luar) ───────────────────────────────
-- Dua tipe CMT, dua tabel terpisah (lihat CLAUDE.md / diskusi fitur):
--
-- 1. cmt_jahit_kirim — CMT Jahit-saja: kita potong sendiri (buku potongan
--    tetap dari kita), potongan dikirim ke vendor luar utk dijahit, lalu
--    disetor balik. SENGAJA TIDAK numpang di jahit_cards/papan Jahit —
--    papan Jahit jarang dipakai utk tracking status (cuma cetak kartu),
--    jadi CMT Jahit berdiri sendiri. Satu baris = satu kode+size+warna
--    (sama granularitasnya dgn satu jahit_cards), `kirim_no` menggabungkan
--    baris2 dari satu kali kirim (mirip batch_id di jahit_cards).
--    Begitu status='setor', baris ini otomatis jadi acuan breakdown di
--    modal rekonsiliasi Finishing (lihat perubahan gajian/api.js +
--    gajian/utils.js), SAMA seperti jahit_cards — begitu diserap/ditambah
--    ke stok, status jadi 'selesai' (paralel ke jahit_cards.status='done').
--
-- 2. cmt_setoran_full — CMT Full: WO/batch produksi itu urusan vendor
--    sepenuhnya (di luar kendali kita) — HPP tetap kita yang buat seperti
--    biasa (breakdown bahan/upah/bordir/finishing/kancing TIDAK berubah,
--    cuma nilai upah_jahit-nya beda sesuai kesepakatan vendor, lihat HPP
--    existing). Begitu vendor setor barang jadi, LANGSUNG nambah stok
--    Gudang (tanpa lewat Finishing internal).
--
-- Keduanya nambah `gaji_cmt_id` (paralel ke jahit_cards.gajian_jahit_id)
-- supaya begitu upahnya sudah diikutkan ke suatu gaji_cmt (tab "CMT Luar"
-- Gajian), tidak ke-double-hitung di periode gajian lain.

CREATE TABLE cmt_jahit_kirim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kirim_no text NOT NULL,
  nama_vendor text NOT NULL,
  kode_produk text NOT NULL,
  nama_produk text,
  size text NOT NULL,
  warna text NOT NULL DEFAULT '_',
  qty integer NOT NULL DEFAULT 0,
  qty_setor integer,
  harga_upah integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'dikirim' CHECK (status IN ('dikirim', 'setor', 'selesai', 'batal')),
  tanggal_kirim date NOT NULL,
  estimasi_selesai date,
  tanggal_setor date,
  gaji_cmt_id uuid REFERENCES gaji_cmt(id) ON DELETE SET NULL,
  catatan text,
  created_by text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cmt_jahit_kirim_kode ON cmt_jahit_kirim(kode_produk);
CREATE INDEX idx_cmt_jahit_kirim_status ON cmt_jahit_kirim(status);
CREATE INDEX idx_cmt_jahit_kirim_gaji_cmt_id ON cmt_jahit_kirim(gaji_cmt_id);
CREATE INDEX idx_cmt_jahit_kirim_kirim_no ON cmt_jahit_kirim(kirim_no);

ALTER TABLE cmt_jahit_kirim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmt_jahit_kirim_select" ON cmt_jahit_kirim FOR SELECT TO authenticated USING (true);
CREATE POLICY "cmt_jahit_kirim_insert" ON cmt_jahit_kirim FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cmt_jahit_kirim_update" ON cmt_jahit_kirim FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cmt_jahit_kirim_delete" ON cmt_jahit_kirim FOR DELETE TO authenticated USING (true);


CREATE TABLE cmt_setoran_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_vendor text NOT NULL,
  kode_produk text NOT NULL,
  nama_produk text,
  tanggal_setor date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  harga_upah integer NOT NULL DEFAULT 0,
  total_upah integer NOT NULL DEFAULT 0,
  gaji_cmt_id uuid REFERENCES gaji_cmt(id) ON DELETE SET NULL,
  catatan text,
  created_by text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cmt_setoran_full_kode ON cmt_setoran_full(kode_produk);
CREATE INDEX idx_cmt_setoran_full_gaji_cmt_id ON cmt_setoran_full(gaji_cmt_id);

ALTER TABLE cmt_setoran_full ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmt_setoran_full_select" ON cmt_setoran_full FOR SELECT TO authenticated USING (true);
CREATE POLICY "cmt_setoran_full_insert" ON cmt_setoran_full FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cmt_setoran_full_update" ON cmt_setoran_full FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cmt_setoran_full_delete" ON cmt_setoran_full FOR DELETE TO authenticated USING (true);


-- Jejak audit stok masuk dari dua sumber CMT ini, paralel ke jahit_card_id
-- yang sudah ada.
ALTER TABLE stok_masuk_log
  ADD COLUMN cmt_jahit_kirim_id uuid REFERENCES cmt_jahit_kirim(id) ON DELETE SET NULL,
  ADD COLUMN cmt_setoran_full_id uuid REFERENCES cmt_setoran_full(id) ON DELETE SET NULL;
