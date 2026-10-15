-- 20260824_push_reminder_state.sql
-- Tabel kecil untuk melacak kapan terakhir kali reminder "biweekly" (stok
-- opname) dikirim, supaya pg_cron bisa jalan HARIAN jam 11:00 WIB tapi
-- fungsinya sendiri yang menentukan kirim/tidak (rolling 14 hari sejak
-- terakhir kirim) — lihat supabase/functions/notify-stok-opname-reminder.
--
-- Kenapa bukan cron day-of-week + hitung paritas minggu ISO: kalau satu run
-- gagal/ke-skip, jadwal rolling ini tetap "self-heal" ke 14 hari berikutnya
-- (tidak permanen geser seperti pendekatan paritas minggu).

create table if not exists public.push_reminder_state (
  key text primary key,
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.push_reminder_state enable row level security;

drop policy if exists "service role full access" on public.push_reminder_state;
create policy "service role full access" on public.push_reminder_state
  for all to service_role using (true) with check (true);

insert into public.push_reminder_state (key, last_sent_at)
values ('stok-opname-reminder', null)
on conflict (key) do nothing;
