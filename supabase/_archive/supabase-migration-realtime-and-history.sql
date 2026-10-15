-- ============================================================
-- REALTIME untuk stok_warna + DELETE policy product_history
-- Jalankan di Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- BAGIAN 1: Aktifkan Supabase Realtime untuk stok_warna
-- ────────────────────────────────────────────────────────────
-- Diperlukan agar POS menerima update langsung ketika admin
-- melakukan Stok Opname atau Approve Transfer.
-- Tanpa ini, postgres_changes event tidak akan dikirim ke POS.

-- Set REPLICA IDENTITY agar Realtime bisa mengirim nilai before/after
ALTER TABLE stok_warna REPLICA IDENTITY FULL;

-- Daftarkan tabel ke publikasi Realtime Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE stok_warna;


-- ────────────────────────────────────────────────────────────
-- BAGIAN 2: Izinkan hapus riwayat di product_history
-- ────────────────────────────────────────────────────────────
-- Tanpa policy ini, tombol × di halaman Riwayat Admin
-- akan gagal dengan error "new row violates row-level security".

CREATE POLICY "Auth users can delete history"
  ON product_history
  FOR DELETE
  TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI: jalankan query ini setelah migration berhasil
-- ────────────────────────────────────────────────────────────

-- Cek tabel yang ada di publikasi realtime:
-- SELECT tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';

-- Cek policy product_history:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'product_history';
