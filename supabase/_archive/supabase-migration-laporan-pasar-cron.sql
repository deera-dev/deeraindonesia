-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Cron job laporan pasar jam 13.00 WIB (Senin, Kamis, Jumat)
-- Format: Supabase Functions SDK baru (jsr:@supabase/server)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- LANGKAH 1 — Deploy edge function dari terminal lokal:
--   supabase functions deploy notify-laporan-pasar
--
-- LANGKAH 2 — Pastikan extensions aktif di Supabase Dashboard:
--   Database → Extensions → pg_cron  → Enable
--   Database → Extensions → pg_net   → Enable
--
-- LANGKAH 3 — Isi variabel di bawah lalu jalankan di SQL Editor.
--   PROJECT_REF   : Settings → General → Reference ID  (cth: abcdefghijklmnop)
--   SERVICE_ROLE  : Settings → API → service_role key
-- ══════════════════════════════════════════════════════════════════════════════

-- Aktifkan extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hapus jadwal lama jika ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-laporan-pasar') THEN
    PERFORM cron.unschedule('notify-laporan-pasar');
  END IF;
END $$;

-- Daftarkan cron: 06.00 UTC = 13.00 WIB, Senin(1) + Kamis(4) + Jumat(5)
SELECT cron.schedule(
  'notify-laporan-pasar',
  '0 6 * * 1,4,5',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-laporan-pasar',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        '<SERVICE_ROLE_KEY>',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cek jadwal terdaftar:
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'notify-laporan-pasar';

-- Untuk test manual (panggil sekarang):
-- SELECT net.http_post(
--   url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-laporan-pasar',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'apikey', '<SERVICE_ROLE_KEY>',
--     'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--   ),
--   body := '{}'::jsonb
-- );

-- ══════════════════════════════════════════════════════════════════════════════
-- ALTERNATIF — tanpa pg_cron (free tier / tidak mau aktifkan extension):
--
-- Daftarkan di cron-job.org (gratis, https://cron-job.org):
--   URL     : https://<PROJECT_REF>.supabase.co/functions/v1/notify-laporan-pasar
--   Method  : POST
--   Headers : apikey: <SERVICE_ROLE_KEY>
--             Authorization: Bearer <SERVICE_ROLE_KEY>
--             Content-Type: application/json
--   Body    : {}
--   Schedule: 0 6 * * 1,4,5   (UTC — sama dengan 13.00 WIB)
-- ══════════════════════════════════════════════════════════════════════════════
