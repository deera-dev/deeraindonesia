-- ── Tabel untuk Web Push subscriptions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text        NOT NULL UNIQUE,
  subscription jsonb     NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users full access" ON push_subscriptions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Tabel untuk Buku Potongan (expected stok) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS expected_stok (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  kode         text        NOT NULL,
  size         text        NOT NULL,
  warna        text        NOT NULL DEFAULT '_',
  expected_qty integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(kode, size, warna)
);

ALTER TABLE expected_stok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users full access" ON expected_stok
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
