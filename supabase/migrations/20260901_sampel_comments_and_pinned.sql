-- Migration: fitur komentar/diskusi + pin di Planning (produksi-sampel)
-- Permintaan Denny 2026-09: "saya ingin ini beneran dipakai untuk planing
-- ... bisa diskusi nambahin komen, ada notif kalau ada yang bikin komen".

-- 1. Kolom pinned — planning yang dipin selalu tampil di atas daftar,
--    terlepas dari urutan/status lainnya (lihat ProduksiSampelPage.jsx).
ALTER TABLE sampel ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS sampel_pinned_idx ON sampel (pinned);

-- 2. Tabel sampel_comments — satu thread komentar per baris sampel.
--    - target_foto_url: kalau diisi, komentar ini nempel/reply ke SATU
--      foto tertentu di array sampel.foto/model_foto (bukan komentar umum).
--    - image_url: foto BARU yang dilampirkan user sbg bagian dari komentar
--      itu sendiri (mis. kirim foto referensi tambahan) — beda konsep dari
--      target_foto_url di atas.
--    - mentions: array email user yang di-@mention di komentar ini, dipakai
--      Edge Function notify-sampel-mention utk kirim notif ke org tsb.
CREATE TABLE IF NOT EXISTS sampel_comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sampel_id        uuid NOT NULL REFERENCES sampel(id) ON DELETE CASCADE,
  text             text,
  image_url        text,
  target_foto_url  text,
  mentions         jsonb NOT NULL DEFAULT '[]',
  user_email       text,
  user_name        text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sampel_comments_content_check CHECK (text IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS sampel_comments_sampel_id_idx ON sampel_comments (sampel_id);
CREATE INDEX IF NOT EXISTS sampel_comments_created_at_idx ON sampel_comments (created_at);

ALTER TABLE sampel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sampel_comments: authenticated full access"
  ON sampel_comments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Realtime — supaya komentar baru muncul otomatis di layar org lain yang
-- sedang membuka planning yang sama (pola sama seperti stok_warna, lihat
-- CLAUDE.md §12).
ALTER TABLE sampel_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE sampel_comments;
