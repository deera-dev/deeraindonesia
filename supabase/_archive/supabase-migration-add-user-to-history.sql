-- Migration: tambah kolom user ke product_history
-- Jalankan di Supabase Dashboard -> SQL Editor

ALTER TABLE product_history
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS user_name  text;


-- ============================================================
-- CARA MEMBUAT USER BARU (via Supabase Dashboard)
-- ============================================================
-- Login menggunakan USERNAME, bukan email.
-- Secara internal, username disimpan sebagai: {username}@deera.internal
--
-- Langkah:
-- 1. Buka: Authentication -> Users -> Add user -> Create new user
-- 2. Email   : {username}@deera.internal
--              Contoh: budi@deera.internal  (username = "budi")
-- 3. Password: isi password yang diinginkan
-- 4. Centang "Auto Confirm User" supaya langsung bisa login
--
-- Opsional - set nama tampilan (muncul di halaman Riwayat):
-- Setelah user dibuat, klik user tersebut -> Edit ->
-- User Metadata (JSON): {"full_name": "Budi Santoso"}
-- ============================================================


-- RLS policies untuk tabel products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth: read products"    ON products;
DROP POLICY IF EXISTS "Auth: insert products"  ON products;
DROP POLICY IF EXISTS "Auth: update products"  ON products;
DROP POLICY IF EXISTS "Auth: delete products"  ON products;

CREATE POLICY "Auth: read products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth: insert products"
  ON products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth: update products"
  ON products FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth: delete products"
  ON products FOR DELETE TO authenticated USING (true);


-- RLS policies untuk product_history
ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth: read history"    ON product_history;
DROP POLICY IF EXISTS "Auth: insert history"  ON product_history;

CREATE POLICY "Auth: read history"
  ON product_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth: insert history"
  ON product_history FOR INSERT TO authenticated WITH CHECK (true);
