-- Migration: tabel pettycash (dana kas kecil terpisah dari Kas utama)
-- jenis "isi"    = isi ulang / top-up dana
-- jenis "keluar" = pengeluaran kecil (konsumsi, transport, ATK, dll)
--
-- Saldo berjalan dihitung di frontend: sum(isi) - sum(keluar), bukan kolom
-- tersendiri, supaya selalu konsisten dengan riwayat transaksi.
--
-- Jalankan di Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS pettycash (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal     date NOT NULL DEFAULT CURRENT_DATE,
  jenis       text NOT NULL CHECK (jenis IN ('isi', 'keluar')),
  kategori    text NOT NULL DEFAULT 'Operasional',
  keterangan  text,
  jumlah      integer NOT NULL CHECK (jumlah > 0),
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pettycash_tanggal ON pettycash(tanggal DESC);

ALTER TABLE pettycash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_pettycash" ON pettycash
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
