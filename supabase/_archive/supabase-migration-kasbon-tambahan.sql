-- Migration: tambah kolom "tambahan" di tabel kasbon
-- Dipakai untuk mencatat riwayat setiap kali kasbon yang sudah ada
-- diakumulasikan (karyawan yang sama menambah pinjaman sebelum lunas),
-- mirroring kolom "cicilan" yang sudah ada untuk riwayat pembayaran.
--
-- Jalankan di Supabase SQL Editor.

ALTER TABLE kasbon
  ADD COLUMN IF NOT EXISTS tambahan jsonb DEFAULT '[]';

-- Pastikan baris lama (yang dibuat sebelum kolom ini ada) punya default array kosong,
-- bukan NULL, supaya logika di frontend (k.tambahan ?? []) tetap konsisten.
UPDATE kasbon SET tambahan = '[]' WHERE tambahan IS NULL;
