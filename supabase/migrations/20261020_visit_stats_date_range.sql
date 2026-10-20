-- Trafik Katalog: ganti filter "N hari terakhir" dengan rentang tanggal eksplisit
-- (mendukung "Hari ini" dan rentang tanggal custom), tetap dihitung di zona Asia/Jakarta.
drop function if exists get_visit_stats(int);

create or replace function get_visit_stats(p_start date, p_end date default current_date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d1 date := least(p_start, p_end);
  d2 date := greatest(p_start, p_end);
  since timestamptz;
  until timestamptz;
  res jsonb;
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;
  if d2 - d1 > 366 then d1 := d2 - 366; end if;
  since := (d1::timestamp) at time zone 'Asia/Jakarta';
  until := ((d2 + 1)::timestamp) at time zone 'Asia/Jakarta';
  select jsonb_build_object(
    'start', d1,
    'end', d2,
    'views', (select count(*) from visit_events where created_at >= since and created_at < until),
    'visitors', (select count(distinct visitor_id) from visit_events where created_at >= since and created_at < until),
    'sessions', (select count(*) from visit_events where created_at >= since and created_at < until and is_landing),
    'by_channel', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select channel, count(*) sessions, count(distinct visitor_id) visitors
        from visit_events where created_at >= since and created_at < until and is_landing group by channel) x), '[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select coalesce(referrer_host, source, '(langsung)') as source, channel, count(*) sessions
        from visit_events where created_at >= since and created_at < until and is_landing group by 1,2 order by 3 desc limit 15) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x order by x.date) from (
        select (created_at at time zone 'Asia/Jakarta')::date as date, count(*) filter (where is_landing) sessions, count(*) views
        from visit_events where created_at >= since and created_at < until group by 1) x), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(x order by x.views desc) from (
        select kode, count(*) views,
          count(*) filter (where is_landing and channel in ('qr_produk','qr_struk')) qr,
          count(*) filter (where is_landing and channel = 'google') google,
          count(*) filter (where is_landing and channel = 'ai') ai
        from visit_events where created_at >= since and created_at < until and kode is not null group by kode order by 2 desc limit 20) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;
revoke all on function get_visit_stats(date, date) from public, anon;
grant execute on function get_visit_stats(date, date) to authenticated;
