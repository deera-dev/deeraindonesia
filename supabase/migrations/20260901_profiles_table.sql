-- Migration: tabel profiles — daftar user login (admin/pos/finance) yang
-- otomatis terisi tiap kali seseorang login, dipakai sbg sumber daftar
-- @mention di fitur komentar Planning (produksi-sampel). Sebelum ini app
-- TIDAK punya daftar user manapun (login cuma via Supabase Auth tanpa
-- tabel profil terpisah) — lihat packages/shared/features/auth/api.js
-- upsertProfile() yang dipanggil dari hooks.js useAuth() setiap kali
-- sesi user berhasil dikenali (bukan cuma saat signIn(), supaya user yang
-- sesinya masih tersimpan dari sebelum migration ini juga ikut terisi
-- begitu app dibuka ulang).

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  full_name   text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Semua user login boleh lihat daftar lengkap (dipakai autocomplete
-- @mention) — tidak ada data sensitif di sini, cuma email + nama tampilan.
CREATE POLICY "profiles: authenticated read all" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Tiap user hanya boleh upsert baris miliknya sendiri (id = auth.uid()).
CREATE POLICY "profiles: upsert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
