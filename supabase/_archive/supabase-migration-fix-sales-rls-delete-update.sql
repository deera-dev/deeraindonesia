-- ============================================================================
-- Fix: tabel `sales` punya RLS aktif tapi hanya ada policy INSERT & SELECT.
-- Tidak ada policy DELETE / UPDATE sama sekali — sehingga setiap permintaan
-- hapus atau edit transaksi yang sudah tersync ke Supabase DITOLAK diam-diam
-- (RLS default: deny kalau tidak ada policy yang cocok, TANPA error).
--
-- Ini akar masalah baris "TEST" yang nyangkut: dari sisi app, delete terlihat
-- "berhasil" (Supabase tidak balas error), tapi nyatanya 0 baris terhapus.
-- Kemungkinan besar fitur "Edit Transaksi" juga kena masalah yang sama untuk
-- UPDATE (perubahan tersimpan di HP tapi tidak pernah ke server).
--
-- Update: file ini dibuat idempotent (aman dijalankan ulang kapan saja, baik
-- pertama kali maupun kalau ternyata pernah dijalankan sebagian) dengan
-- menambahkan DROP POLICY IF EXISTS sebelum tiap CREATE POLICY — supaya tidak
-- error "policy already exists" kalau di-run lebih dari sekali.
--
-- Jalankan via Supabase Dashboard → SQL Editor.
-- ============================================================================

-- 1) Izinkan user yang login menghapus baris sales
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;
CREATE POLICY "Authenticated users can delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (true);

-- 2) Izinkan user yang login mengupdate baris sales (utk fitur Edit Transaksi)
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
CREATE POLICY "Authenticated users can update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ── Verifikasi: harus muncul 4 baris sekarang (INSERT, SELECT, UPDATE, DELETE) ──
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sales'
ORDER BY cmd;
