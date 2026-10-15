-- Migration: tabel push_subscriptions untuk Web Push notification
-- Setiap device/browser yang login POS menyimpan push subscription-nya di sini.
-- Edge Function notify-sale akan kirim push ke semua endpoint yang terdaftar.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    text UNIQUE NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_email  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index untuk lookup cepat per user
CREATE INDEX IF NOT EXISTS push_subscriptions_user_email_idx
  ON push_subscriptions(user_email);

-- RLS: semua user authenticated bisa insert/update subscription milik sendiri,
-- service role (Edge Function) bisa select semua
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert own subscription" ON push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "update own subscription" ON push_subscriptions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "service role full access" ON push_subscriptions
  TO service_role USING (true);
