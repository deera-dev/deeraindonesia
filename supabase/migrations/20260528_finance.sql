-- ============================================================
-- Migration: Finance App
-- Tanggal: 2026-05-28
-- ============================================================

-- ── Drop jika tabel lama sudah ada (fresh run) ───────────────
DROP TABLE IF EXISTS kasbon          CASCADE;
DROP TABLE IF EXISTS kas             CASCADE;
DROP TABLE IF EXISTS gaji_cmt        CASCADE;
DROP TABLE IF EXISTS gaji_kreatif    CASCADE;
DROP TABLE IF EXISTS gaji_qa         CASCADE;
DROP TABLE IF EXISTS gaji_finishing  CASCADE;
DROP TABLE IF EXISTS gaji_jahit      CASCADE;
DROP TABLE IF EXISTS gaji_potong     CASCADE;
DROP TABLE IF EXISTS gajian_minggu   CASCADE;
DROP TABLE IF EXISTS karyawan        CASCADE;

-- ── Karyawan ─────────────────────────────────────────────────
CREATE TABLE karyawan (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        text NOT NULL,
  tim         text NOT NULL CHECK (tim IN ('potong','jahit','finishing','kreatif','lainnya')),
  no_rekening text,
  nama_bank   text,
  aktif       boolean DEFAULT true,
  catatan     text,
  created_at  timestamptz DEFAULT now()
);

-- ── Header periode gajian (tiap sabtu) ───────────────────────
CREATE TABLE gajian_minggu (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal_sabtu    date NOT NULL UNIQUE,
  status           text DEFAULT 'draft' CHECK (status IN ('draft','final')),
  catatan          text,
  -- totals per tim (diisi saat finalisasi)
  total_potong     integer DEFAULT 0,
  total_jahit      integer DEFAULT 0,
  total_finishing  integer DEFAULT 0,
  total_qa         integer DEFAULT 0,
  total_kreatif    integer DEFAULT 0,
  total_cmt        integer DEFAULT 0,
  total_gaji       integer DEFAULT 0,
  -- request ke investor
  pettycash        integer DEFAULT 0,
  tambahan         jsonb DEFAULT '[]',  -- [{label, jumlah}]
  total_request    integer DEFAULT 0,
  created_by       text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── Tim Potong ────────────────────────────────────────────────
-- Satu baris per karyawan per periode.
-- qty_potongan = total pcs potong, tarif_potongan = range 4000-6000
CREATE TABLE gaji_potong (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id        uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  karyawan_id      uuid REFERENCES karyawan(id),
  jumlah_pola      integer DEFAULT 0,
  jumlah_sampel    integer DEFAULT 0,
  qty_potongan     integer DEFAULT 0,
  tarif_potongan   integer DEFAULT 4000,
  total_upah       integer DEFAULT 0,
  catatan          text,
  created_at       timestamptz DEFAULT now()
);

-- ── Tim Jahit ─────────────────────────────────────────────────
-- kartu_items : [{kode, warna, ukuran, jumlah, upah}]
-- permak_items: [{keterangan, jumlah, upah}]
CREATE TABLE gaji_jahit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id     uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  karyawan_id   uuid REFERENCES karyawan(id),
  kartu_items   jsonb DEFAULT '[]',
  permak_items  jsonb DEFAULT '[]',
  total_upah    integer DEFAULT 0,
  catatan       text,
  created_at    timestamptz DEFAULT now()
);

-- ── Tim Finishing ─────────────────────────────────────────────
-- Satu baris per periode (tidak per karyawan).
-- items: [{nama_produk, jumlah, kancing_qty}]
-- tarif: jumlah × 2500 (buang benang+gosok+pasang pin+lipat+hangtag+seri) + kancing × 150
CREATE TABLE gaji_finishing (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id   uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  items       jsonb DEFAULT '[]',
  total_upah  integer DEFAULT 0,
  catatan     text,
  created_at  timestamptz DEFAULT now()
);

-- ── Tim QA ────────────────────────────────────────────────────
-- Satu baris per periode, tarif QC = Rp500/pcs
CREATE TABLE gaji_qa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id   uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  jumlah_pcs  integer DEFAULT 0,
  total_upah  integer DEFAULT 0,
  catatan     text,
  created_at  timestamptz DEFAULT now()
);

-- ── Tim Kreatif ───────────────────────────────────────────────
CREATE TABLE gaji_kreatif (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id     uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  karyawan_id   uuid REFERENCES karyawan(id),
  jumlah_video  integer DEFAULT 0,
  jumlah_foto   integer DEFAULT 0,
  jumlah_logo   integer DEFAULT 0,
  total_upah    integer DEFAULT 0,
  catatan       text,
  created_at    timestamptz DEFAULT now()
);

-- ── CMT Luar ─────────────────────────────────────────────────
CREATE TABLE gaji_cmt (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id      uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  nama_vendor    text,
  no_rekening    text,
  nama_bank      text,
  tanggal_kirim  date,
  tanggal_terima date,
  jumlah_kirim   integer DEFAULT 0,
  jumlah_terima  integer DEFAULT 0,
  harga_upah     integer DEFAULT 0,
  total_upah     integer DEFAULT 0,
  catatan        text,
  created_at     timestamptz DEFAULT now()
);

-- ── Kas ───────────────────────────────────────────────────────
CREATE TABLE kas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal     date NOT NULL DEFAULT CURRENT_DATE,
  jenis       text NOT NULL CHECK (jenis IN ('masuk','keluar')),
  kategori    text NOT NULL DEFAULT 'Lainnya',
  keterangan  text,
  jumlah      integer NOT NULL CHECK (jumlah > 0),
  referensi   text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

-- ── Kasbon ────────────────────────────────────────────────────
-- cicilan: [{tanggal, jumlah, keterangan}]
CREATE TABLE kasbon (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  karyawan_id uuid REFERENCES karyawan(id),
  tanggal     date NOT NULL DEFAULT CURRENT_DATE,
  jumlah      integer NOT NULL CHECK (jumlah > 0),
  keterangan  text,
  cicilan     jsonb DEFAULT '[]',
  sisa        integer,
  status      text DEFAULT 'belum' CHECK (status IN ('belum','lunas')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_gajian_tanggal      ON gajian_minggu(tanggal_sabtu DESC);
CREATE INDEX idx_potong_gajian       ON gaji_potong(gajian_id);
CREATE INDEX idx_jahit_gajian        ON gaji_jahit(gajian_id);
CREATE INDEX idx_finishing_gajian    ON gaji_finishing(gajian_id);
CREATE INDEX idx_qa_gajian           ON gaji_qa(gajian_id);
CREATE INDEX idx_kreatif_gajian      ON gaji_kreatif(gajian_id);
CREATE INDEX idx_cmt_gajian          ON gaji_cmt(gajian_id);
CREATE INDEX idx_kas_tanggal         ON kas(tanggal DESC);
CREATE INDEX idx_kasbon_karyawan     ON kasbon(karyawan_id);
CREATE INDEX idx_kasbon_status       ON kasbon(status);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE karyawan        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gajian_minggu   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaji_potong     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaji_jahit      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaji_finishing  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaji_qa         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaji_kreatif    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaji_cmt        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasbon          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'karyawan','gajian_minggu','gaji_potong','gaji_jahit',
    'gaji_finishing','gaji_qa','gaji_kreatif','gaji_cmt','kas','kasbon'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
