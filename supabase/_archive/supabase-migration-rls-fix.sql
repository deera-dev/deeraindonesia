-- ============================================================
-- PERBAIKAN RLS + CLEANUP LEGACY STOK FIELDS
-- Jalankan di Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- BAGIAN 1: Perbaikan RLS stok_warna
-- ────────────────────────────────────────────────────────────
-- Hapus SEMUA policy lama (nama apapun) dari tabel stok_warna
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'stok_warna' AND schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON stok_warna', r.policyname);
  END LOOP;
END $$;

-- Pastikan RLS aktif
ALTER TABLE stok_warna ENABLE ROW LEVEL SECURITY;

-- Buat policy baru yang bersih
-- anon (catalog app) dan authenticated (POS app) boleh baca
CREATE POLICY "stok_warna_select"
  ON stok_warna FOR SELECT
  TO anon, authenticated
  USING (true);

-- Hanya authenticated yang boleh tulis
CREATE POLICY "stok_warna_insert"
  ON stok_warna FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "stok_warna_update"
  ON stok_warna FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "stok_warna_delete"
  ON stok_warna FOR DELETE
  TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────
-- BAGIAN 2: Hapus kolom stok lama dari tabel products
-- (kolom ini sudah tidak dipakai — stok sekarang ada di stok_warna)
-- ────────────────────────────────────────────────────────────
ALTER TABLE products DROP COLUMN IF EXISTS stok_gudang;
ALTER TABLE products DROP COLUMN IF EXISTS stok_cideng;
ALTER TABLE products DROP COLUMN IF EXISTS stok_tegalgubug;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI: jalankan query ini setelah migration berhasil
-- ────────────────────────────────────────────────────────────

-- Cek semua stok yang ada:
-- SELECT kode, size, warna, gudang, cideng, tegalgubug
-- FROM stok_warna ORDER BY kode, size, warna;

-- Cek policy yang aktif:
-- SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'stok_warna';


-- ────────────────────────────────────────────────────────────
-- PENJELASAN SINGKAT
-- ────────────────────────────────────────────────────────────
-- Sebelumnya tabel products punya kolom stok_gudang, stok_cideng,
-- stok_tegalgubug — ini adalah sistem lama yang tidak sinkron
-- dengan tabel stok_warna.
--
-- Sistem baru hanya pakai stok_warna:
--   Admin  → tulis ke stok_warna
--   POS    → sync stok_warna ke IndexedDB, baca dari sana
--   Catalog → baca stok_warna langsung dari Supabase
--
-- Setelah menjalankan SQL ini:
--   1. POS: tap ↻ Sync di header → stok akan muncul
--   2. Catalog: refresh halaman → sold out stamp muncul
-- ────────────────────────────────────────────────────────────
