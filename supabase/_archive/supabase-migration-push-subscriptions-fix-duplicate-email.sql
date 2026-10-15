-- ─────────────────────────────────────────────────────────────────────────
-- Fix: 23505 duplicate key value violates unique constraint
--      "push_subscriptions_user_email_key"
--
-- Konteks: skema lama push_subscriptions dibuat dengan
--   user_email text NOT NULL UNIQUE
-- yaitu SATU baris per user/email. Skema baru (kolom endpoint/p256dh/auth)
-- didesain SATU baris per DEVICE/BROWSER (key-nya `endpoint`), supaya satu
-- akun admin yang login di 2+ device/browser tetap dapat notifikasi push di
-- semua device-nya, bukan cuma device terakhir yang subscribe.
--
-- Begitu device kedua mencoba subscribe (endpoint baru, upsert onConflict:
-- "endpoint"), Postgres melakukan INSERT baris baru — tapi constraint UNIQUE
-- lama di kolom user_email masih ada, jadi INSERT itu gagal dengan 23505
-- karena email yang sama sudah dipakai di baris device pertama.
--
-- Fix: hapus constraint UNIQUE lama di user_email. Tabel sekarang punya 1
-- baris per endpoint (device), bukan per email — beberapa baris boleh share
-- email yang sama (multi-device), itu yang memang diinginkan.
--
-- Jalankan ini di Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_email_key;

-- Pastikan endpoint tetap jadi kunci unik per device (dipakai semua
-- onConflict: "endpoint" di kode apps/pos & apps/admin). Kalau constraint
-- ini belum ada (skema sangat lama), buat sekarang.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
