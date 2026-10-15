-- 20260824_transfer_and_stok_opname_reminder_cron.sql
-- pg_cron jobs utk 2 reminder baru (permintaan Denny 2026-08), jam 11:00
-- WIB = 04:00 UTC:
--   1. notify-transfer-reminder     — hari pasar (Senin/Kamis/Jumat)
--   2. notify-stok-opname-reminder  — dicek harian, fungsinya sendiri yang
--      gate ke rolling 14 hari (lihat push_reminder_state)

select cron.schedule(
  'notify-transfer-reminder',
  '0 4 * * 1,4,5',
  $$
  select net.http_post(
    url     := 'https://khpgjfsaucrhihadnewq.supabase.co/functions/v1/notify-transfer-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGdqZnNhdWNyaGloYWRuZXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0OTczNywiZXhwIjoyMDkzMjI1NzM3fQ.tzuY7LjfF-dkSyR-thN4I353AT2fApCwGOux-LH9zyE',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGdqZnNhdWNyaGloYWRuZXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0OTczNywiZXhwIjoyMDkzMjI1NzM3fQ.tzuY7LjfF-dkSyR-thN4I353AT2fApCwGOux-LH9zyE'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'notify-stok-opname-reminder',
  '0 4 * * *',
  $$
  select net.http_post(
    url     := 'https://khpgjfsaucrhihadnewq.supabase.co/functions/v1/notify-stok-opname-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGdqZnNhdWNyaGloYWRuZXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0OTczNywiZXhwIjoyMDkzMjI1NzM3fQ.tzuY7LjfF-dkSyR-thN4I353AT2fApCwGOux-LH9zyE',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGdqZnNhdWNyaGloYWRuZXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0OTczNywiZXhwIjoyMDkzMjI1NzM3fQ.tzuY7LjfF-dkSyR-thN4I353AT2fApCwGOux-LH9zyE'
    ),
    body := '{}'::jsonb
  );
  $$
);
