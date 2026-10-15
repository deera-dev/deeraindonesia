-- Riwayat notifikasi admin: setiap push yang dikirim edge function dicatat di sini,
-- supaya notifikasi yang terlewat bisa dilihat lagi di halaman Notifikasi (admin).
-- Semua logika (siapa penerima, status baca) ada di DB; frontend hanya memanggil RPC.
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,
  title text not null,
  body text,
  url text,
  tag text,
  target_emails text[],          -- null = broadcast ke semua admin
  exclude_email text             -- pembuat aksi (tidak menerima notif)
);
create index if not exists app_notifications_created_idx on public.app_notifications (created_at desc);
alter table public.app_notifications enable row level security;  -- tanpa policy: hanya via RPC / service role

create table if not exists public.notification_state (
  user_email text primary key,
  last_seen_at timestamptz not null default 'epoch'
);
alter table public.notification_state enable row level security;

create or replace function public.get_my_notifications(p_limit int default 100)
returns table (id uuid, created_at timestamptz, type text, title text, body text, url text, is_unread boolean)
language sql stable security definer set search_path = public as $$
  with me as (select lower(auth.jwt() ->> 'email') as email),
       st as (select coalesce((select last_seen_at from notification_state s, me where s.user_email = me.email), 'epoch'::timestamptz) as seen)
  select n.id, n.created_at, n.type, n.title, n.body, n.url, n.created_at > st.seen
  from app_notifications n, me, st
  where n.created_at > now() - interval '30 days'
    and (n.target_emails is null or me.email = any (select lower(e) from unnest(n.target_emails) e))
    and (n.exclude_email is null or lower(n.exclude_email) <> me.email)
  order by n.created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.mark_notifications_seen()
returns void language sql security definer set search_path = public as $$
  insert into notification_state (user_email, last_seen_at)
  values (lower(auth.jwt() ->> 'email'), now())
  on conflict (user_email) do update set last_seen_at = excluded.last_seen_at;
$$;

grant execute on function public.get_my_notifications(int), public.mark_notifications_seen() to authenticated;
revoke execute on function public.get_my_notifications(int), public.mark_notifications_seen() from anon;
