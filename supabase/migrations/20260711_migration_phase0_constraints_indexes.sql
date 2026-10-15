-- ============================================================================
-- Migration Phase 0 — Database Constraints & Indexes
-- Tanggal: 2026-07-11
--
-- Tujuan: memperkuat integritas data (constraint) dan performa query (index)
-- SEBELUM implementasi RPC/trigger/perubahan arsitektur lain. Migration ini
-- TIDAK mengubah business logic aplikasi, TIDAK membuat RPC/trigger/generated
-- column/view baru, dan TIDAK menghapus/mengubah data apapun secara otomatis.
--
-- Cara pakai: jalankan seluruh file ini sekali lewat Supabase SQL Editor.
-- Aman dijalankan berkali-kali (idempotent) — index pakai IF NOT EXISTS,
-- constraint pakai pola DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT (konvensi
-- yang sama dipakai supabase-migration-finance-qc.sql).
--
-- PENTING: setiap constraint UNIQUE/CHECK di bawah didahului blok validasi
-- (DO $$ ... RAISE EXCEPTION ... $$) yang mengecek data yang SUDAH ADA.
-- Kalau ditemukan baris yang melanggar, migration BERHENTI dengan pesan
-- error berisi detail baris yang bermasalah — TIDAK ada data yang dihapus
-- atau diubah otomatis. Perbaiki data itu secara manual dulu, baru jalankan
-- ulang file ini.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN 1: CONSTRAINTS
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1.1 stok_warna — gudang/cideng/tegalgubug tidak boleh negatif ──────────
-- Status sebelum migration: TIDAK ADA constraint sama sekali pada 3 kolom
-- ini (dicek: tidak ada CHECK apapun pada stok_warna di seluruh riwayat
-- migration). Stok bisa jadi negatif kalau ada race condition antara
-- transaksi POS offline-sync yang bersamaan.
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM stok_warna
  WHERE gudang < 0 OR cideng < 0 OR tegalgubug < 0;

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'Migration dibatalkan: % baris di stok_warna punya nilai negatif pada gudang/cideng/tegalgubug. '
      'Perbaiki data ini secara manual dulu (SELECT kode, size, warna, gudang, cideng, tegalgubug FROM stok_warna '
      'WHERE gudang < 0 OR cideng < 0 OR tegalgubug < 0), baru jalankan ulang migration ini.',
      v_count;
  END IF;
END $$;

ALTER TABLE stok_warna DROP CONSTRAINT IF EXISTS stok_warna_gudang_nonneg;
ALTER TABLE stok_warna ADD CONSTRAINT stok_warna_gudang_nonneg CHECK (gudang >= 0);

ALTER TABLE stok_warna DROP CONSTRAINT IF EXISTS stok_warna_cideng_nonneg;
ALTER TABLE stok_warna ADD CONSTRAINT stok_warna_cideng_nonneg CHECK (cideng >= 0);

ALTER TABLE stok_warna DROP CONSTRAINT IF EXISTS stok_warna_tegalgubug_nonneg;
ALTER TABLE stok_warna ADD CONSTRAINT stok_warna_tegalgubug_nonneg CHECK (tegalgubug >= 0);


-- ── 1.2 kasbon — sisa >= 0 DAN sisa <= jumlah ───────────────────────────────
-- Status sebelum migration: kolom `sisa` (integer, nullable, tidak ada
-- default) sama sekali tidak punya CHECK. `jumlah` sudah punya CHECK
-- (jumlah > 0) dari 20260528_finance.sql — tidak disentuh di sini.
-- Catatan: CHECK constraint Postgres otomatis meloloskan baris dengan
-- sisa IS NULL (perbandingan dengan NULL = NULL, bukan FALSE) — jadi baris
-- yang belum pernah diisi `sisa` tidak akan diblokir oleh constraint ini,
-- konsisten dengan kolom yang memang nullable.
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM kasbon
  WHERE sisa IS NOT NULL AND (sisa < 0 OR sisa > jumlah);

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'Migration dibatalkan: % baris di kasbon punya sisa < 0 atau sisa > jumlah. '
      'Perbaiki data ini secara manual dulu (SELECT id, karyawan_id, jumlah, sisa FROM kasbon '
      'WHERE sisa IS NOT NULL AND (sisa < 0 OR sisa > jumlah)), baru jalankan ulang migration ini.',
      v_count;
  END IF;
END $$;

ALTER TABLE kasbon DROP CONSTRAINT IF EXISTS kasbon_sisa_nonneg;
ALTER TABLE kasbon ADD CONSTRAINT kasbon_sisa_nonneg CHECK (sisa >= 0);

ALTER TABLE kasbon DROP CONSTRAINT IF EXISTS kasbon_sisa_le_jumlah;
ALTER TABLE kasbon ADD CONSTRAINT kasbon_sisa_le_jumlah CHECK (sisa <= jumlah);


-- ── 1.3 transfers — transfer_no harus UNIQUE ────────────────────────────────
-- Status sebelum migration: TIDAK ADA constraint UNIQUE pada transfer_no
-- (hanya NOT NULL). transfer_no di-generate aplikasi dengan format
-- "SJ-YYYYMMDD-{rand3}" — secara teori bisa tabrakan kalau random 3-digit
-- kebetulan sama pada hari yang sama.
DO $$
DECLARE v_count integer;
  v_examples text;
BEGIN
  SELECT count(*) INTO v_count FROM (
    SELECT transfer_no FROM transfers GROUP BY transfer_no HAVING count(*) > 1
  ) dup;

  IF v_count > 0 THEN
    SELECT string_agg(transfer_no, ', ') INTO v_examples FROM (
      SELECT transfer_no FROM transfers GROUP BY transfer_no HAVING count(*) > 1 LIMIT 10
    ) dup2;
    RAISE EXCEPTION
      'Migration dibatalkan: % nilai transfer_no di tabel transfers punya duplikat (contoh: %). '
      'Ganti transfer_no salah satu baris yang duplikat secara manual dulu (jangan hapus data), '
      'baru jalankan ulang migration ini.',
      v_count, v_examples;
  END IF;
END $$;

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_transfer_no_unique;
ALTER TABLE transfers ADD CONSTRAINT transfers_transfer_no_unique UNIQUE (transfer_no);


-- ── 1.4 gajian_minggu — tanggal_sabtu harus UNIQUE ──────────────────────────
-- Status sebelum migration: SUDAH ADA. Kolom didefinisikan sebagai
-- `tanggal_sabtu date NOT NULL UNIQUE` sejak 20260528_finance.sql.
-- Tidak ada tindakan di sini — dicatat di laporan sebagai "sudah ada".


-- ── 1.5 sampel — status hanya boleh draft/approved/rejected ────────────────
-- Status sebelum migration: kolom `status` punya DEFAULT 'draft' dan
-- komentar SQL yang MENYEBUTKAN 3 nilai yang valid, tapi TIDAK ADA CHECK
-- constraint yang benar-benar menegakkannya di level database — nilai lain
-- masih bisa masuk lewat query manual/bug aplikasi.
DO $$
DECLARE v_count integer;
  v_examples text;
BEGIN
  SELECT count(*) INTO v_count FROM sampel
  WHERE status NOT IN ('draft', 'approved', 'rejected');

  IF v_count > 0 THEN
    SELECT string_agg(DISTINCT status, ', ') INTO v_examples FROM sampel
    WHERE status NOT IN ('draft', 'approved', 'rejected');
    RAISE EXCEPTION
      'Migration dibatalkan: % baris di sampel punya status di luar draft/approved/rejected (nilai ditemukan: %). '
      'Perbaiki data ini secara manual dulu, baru jalankan ulang migration ini.',
      v_count, v_examples;
  END IF;
END $$;

ALTER TABLE sampel DROP CONSTRAINT IF EXISTS sampel_status_check;
ALTER TABLE sampel ADD CONSTRAINT sampel_status_check
  CHECK (status IN ('draft', 'approved', 'rejected'));


-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN 2: INDEXES
-- Semua CREATE INDEX di sini pakai IF NOT EXISTS — aman terhadap index yang
-- sudah ada, dan Postgres otomatis skip tanpa error kalau sudah ada persis.
-- ────────────────────────────────────────────────────────────────────────────

-- ── 2.1 Payroll — index gajian_id ───────────────────────────────────────────
-- Status sebelum migration: SEMUA 6 tabel SUDAH punya index pada gajian_id
-- (idx_potong_gajian, idx_jahit_gajian, idx_finishing_gajian, idx_qc_gajian,
-- idx_kreatif_gajian, idx_cmt_gajian — dari 20260528_finance.sql &
-- supabase-migration-finance-qc.sql). Baris di bawah ini murni JARING
-- PENGAMAN idempotent (tidak menciptakan apapun yang baru), supaya migration
-- Phase 0 ini tetap eksplisit menyatakan syarat tsb terpenuhi walau dijalankan
-- di lingkungan lain yang riwayat migration-nya berbeda.
CREATE INDEX IF NOT EXISTS idx_potong_gajian    ON gaji_potong(gajian_id);
CREATE INDEX IF NOT EXISTS idx_jahit_gajian     ON gaji_jahit(gajian_id);
CREATE INDEX IF NOT EXISTS idx_finishing_gajian ON gaji_finishing(gajian_id);
CREATE INDEX IF NOT EXISTS idx_qc_gajian        ON gaji_qc(gajian_id);
CREATE INDEX IF NOT EXISTS idx_kreatif_gajian   ON gaji_kreatif(gajian_id);
CREATE INDEX IF NOT EXISTS idx_cmt_gajian       ON gaji_cmt(gajian_id);


-- ── 2.2 Kasbon — index komposit (karyawan_id, status) ───────────────────────
-- Status sebelum migration: ada 2 index TERPISAH (idx_kasbon_karyawan pada
-- karyawan_id, idx_kasbon_status pada status) — BUKAN index komposit.
-- Index komposit di bawah ini baru, untuk query "kasbon aktif milik
-- karyawan X" yang memfilter kedua kolom sekaligus.
CREATE INDEX IF NOT EXISTS idx_kasbon_karyawan_status ON kasbon(karyawan_id, status);


-- ── 2.3 Transfers — index status & created_by ───────────────────────────────
-- Status sebelum migration: SUDAH ADA KEDUANYA (transfers_status_idx,
-- transfers_created_by_idx — dari 20260522_transfers.sql). Baris di bawah
-- murni jaring pengaman idempotent, sama seperti Payroll di atas.
CREATE INDEX IF NOT EXISTS transfers_status_idx     ON transfers(status);
CREATE INDEX IF NOT EXISTS transfers_created_by_idx ON transfers(created_by);


-- ── 2.4 Produksi — index tanggal_produksi ───────────────────────────────────
-- Status sebelum migration: SUDAH ADA (produksi_batch_tanggal_idx, dari
-- 20260525_produksi.sql, arah DESC). Baris di bawah jaring pengaman
-- idempotent.
CREATE INDEX IF NOT EXISTS produksi_batch_tanggal_idx ON produksi_batch(tanggal_produksi DESC);


-- ── 2.5 Bahan — index komposit (status_bayar, jatuh_tempo) ──────────────────
-- Status sebelum migration: masing-masing tabel punya index TERPISAH pada
-- status_bayar dan jatuh_tempo (bahan_pembelian_status_bayar_idx,
-- bahan_pembelian_jatuh_tempo_idx, bahan_pinjam_status_bayar_idx,
-- bahan_pinjam_jatuh_tempo_idx — dari 20260525_produksi.sql) — BUKAN index
-- komposit. Index komposit di bawah ini baru, untuk query "bahan yang belum
-- lunas & jatuh tempo terdekat" (dipakai halaman Tagihan Bahan).
CREATE INDEX IF NOT EXISTS bahan_pembelian_status_bayar_jatuh_tempo_idx
  ON bahan_pembelian(status_bayar, jatuh_tempo);
CREATE INDEX IF NOT EXISTS bahan_pinjam_status_bayar_jatuh_tempo_idx
  ON bahan_pinjam(status_bayar, jatuh_tempo);


-- ── 2.6 Product History — index changed_at & category ───────────────────────
-- Status sebelum migration: SUDAH ADA KEDUANYA (idx_product_history_changed_at,
-- idx_product_history_category — dari supabase-migration-add-history.sql &
-- supabase-migration-history-audit.sql). Baris di bawah jaring pengaman
-- idempotent.
CREATE INDEX IF NOT EXISTS idx_product_history_changed_at ON product_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_history_category   ON product_history(category);


-- ── 2.7 Sales — index date & location ───────────────────────────────────────
-- Status sebelum migration: date SUDAH ADA (sales_date_idx, dari
-- supabase-migration-sales-table.sql). location BELUM ADA index sama sekali
-- (kolomnya sendiri baru ditambah belakangan di supabase-migration-stok-warna.sql,
-- tidak pernah diikuti index).
CREATE INDEX IF NOT EXISTS sales_date_idx     ON sales(date DESC);
CREATE INDEX IF NOT EXISTS sales_location_idx ON sales(location);


-- ============================================================================
-- VERIFIKASI (jalankan manual setelah migration sukses, opsional)
-- ============================================================================
-- Cek semua constraint yang baru ditambahkan:
-- SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname IN (
--   'stok_warna_gudang_nonneg', 'stok_warna_cideng_nonneg', 'stok_warna_tegalgubug_nonneg',
--   'kasbon_sisa_nonneg', 'kasbon_sisa_le_jumlah',
--   'transfers_transfer_no_unique', 'sampel_status_check'
-- );
--
-- Cek semua index yang relevan ke migration ini:
-- SELECT tablename, indexname, indexdef FROM pg_indexes
-- WHERE tablename IN (
--   'gaji_potong','gaji_jahit','gaji_finishing','gaji_qc','gaji_kreatif','gaji_cmt',
--   'kasbon','transfers','produksi_batch','bahan_pembelian','bahan_pinjam',
--   'product_history','sales'
-- ) ORDER BY tablename, indexname;
-- ============================================================================
