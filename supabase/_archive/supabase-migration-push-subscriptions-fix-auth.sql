-- Fix: error "Could not find the 'auth' column of 'push_subscriptions' in the
-- schema cache" (PGRST204) yang muncul saat device baru mendaftar Web Push
-- (lihat apps/pos/src/hooks/usePushSubscription.js — upsert ke push_subscriptions
-- dengan kolom endpoint/p256dh/auth/user_email, sesuai skema di
-- supabase-migration-push-subscriptions.sql).
--
-- Migration awal SUDAH mendefinisikan kolom `auth`, tapi error ini berarti
-- kolomnya tidak benar-benar ada di database (kemungkinan tabel sempat dibuat
-- duluan dengan skema lama sebelum kolom auth ditambahkan ke script, jadi
-- `CREATE TABLE IF NOT EXISTS` di migration awal jadi no-op) — atau PostgREST
-- masih pakai schema cache lama. ALTER TABLE di bawah aman dijalankan walau
-- kolomnya sudah ada (idempotent).
--
-- Jalankan di Supabase SQL Editor.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS endpoint text,
  ADD COLUMN IF NOT EXISTS p256dh   text,
  ADD COLUMN IF NOT EXISTS auth     text;

-- Backfill kolom yang NOT NULL supaya ALTER constraint di bawah tidak gagal
-- kalau ada baris lama tanpa nilai (peninggalan skema sebelumnya).
UPDATE push_subscriptions SET p256dh = '' WHERE p256dh IS NULL;
UPDATE push_subscriptions SET auth   = '' WHERE auth   IS NULL;

ALTER TABLE push_subscriptions
  ALTER COLUMN p256dh SET NOT NULL,
  ALTER COLUMN auth   SET NOT NULL;

-- endpoint harus unik (dipakai sebagai onConflict di upsert) — buat constraint
-- kalau belum ada, supaya upsert per-device tidak menumpuk baris duplikat.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

-- Paksa PostgREST reload schema cache supaya kolom langsung dikenali tanpa
-- perlu restart project.
NOTIFY pgrst, 'reload schema';
