-- Migration: ubah unique constraint produksi_batch
-- Sebelumnya: UNIQUE(batch_no) — hanya 1 produk per batch
-- Sesudah:    UNIQUE(batch_no, kode_produk) — banyak produk boleh dalam 1 batch
--
-- Diperlukan agar fitur "tambah produk ke batch yang sama" bisa berjalan.
-- Jalankan di Supabase SQL Editor.

-- 1. Hapus unique index lama (hanya pada batch_no)
DROP INDEX IF EXISTS produksi_batch_no_idx;

-- 2. Buat unique index baru pada (batch_no, kode_produk)
CREATE UNIQUE INDEX produksi_batch_no_kode_idx
  ON produksi_batch(batch_no, kode_produk);

-- 3. Buat regular index pada batch_no saja untuk pencarian/grouping cepat
CREATE INDEX IF NOT EXISTS produksi_batch_no_lookup_idx
  ON produksi_batch(batch_no);
