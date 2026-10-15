-- Migration: read-receipt Diskusi Planning (permintaan Denny 2026-09:
-- "ada notif kalau belum di read, ... bulatan kecil kasih tau ada berapa
-- chat yang belum terbaca" + "ada info untuk mengetahui siapa saja yang
-- sudah membaca chat tersebut").
--
-- Satu baris per (sampel_id, user_email) — hanya menyimpan KAPAN TERAKHIR
-- user itu membuka tab Diskusi planning ini (last_read_at), BUKAN status
-- per-komentar (jauh lebih sederhana & cukup utk kebutuhan "berapa belum
-- dibaca" + "siapa sudah baca sampai chat terakhir").
--
-- Dipakai dari 2 arah:
-- 1. Badge unread di SampelCard: hitung sampel_comments milik sampel ini
--    yang dibuat SETELAH last_read_at milik user yang sedang login (dan
--    bukan komentar user itu sendiri) — dihitung di client, lihat
--    features/produksi-sampel/utils.js computeUnreadCounts().
-- 2. "Dibaca oleh" di CommentThread: user lain yang last_read_at-nya sudah
--    >= created_at komentar TERAKHIR di thread ini dianggap "sudah baca".
CREATE TABLE IF NOT EXISTS sampel_reads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sampel_id     uuid NOT NULL REFERENCES sampel(id) ON DELETE CASCADE,
  user_email    text NOT NULL,
  user_name     text,
  last_read_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sampel_id, user_email)
);

CREATE INDEX IF NOT EXISTS sampel_reads_sampel_id_idx ON sampel_reads (sampel_id);
CREATE INDEX IF NOT EXISTS sampel_reads_user_email_idx ON sampel_reads (user_email);

ALTER TABLE sampel_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sampel_reads: authenticated full access"
  ON sampel_reads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
