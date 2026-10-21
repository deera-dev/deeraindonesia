-- Trafik Katalog: pisahkan kunjungan tim internal (perangkat yang pernah login admin/POS/finance
-- atau membuka katalog dengan ?tim=1), dan link share Ngorder pendek deera.id/t/<kode>.
create table if not exists visit_internal_visitors (
  visitor_id text primary key,
  created_at timestamptz not null default now()
);
alter table visit_internal_visitors enable row level security;

update ngorder_trip t set toko = (
  select coalesce(jsonb_agg(
    case when e ? 'link' then e else e || jsonb_build_object('link', substr(md5(random()::text || coalesce(e->>'toko_id', '')), 1, 6)) end
    order by ord), '[]'::jsonb)
  from jsonb_array_elements(t.toko) with ordinality as x(e, ord)
)
where jsonb_typeof(t.toko) = 'array' and jsonb_array_length(t.toko) > 0;

drop function if exists track_visit(text,text,text,text,text,text,text,text,boolean,text,text,text);
create or replace function track_visit(
  p_visitor text, p_session text, p_path text, p_referrer text default null,
  p_utm_source text default null, p_utm_medium text default null, p_utm_campaign text default null,
  p_src text default null, p_is_landing boolean default false, p_device text default null,
  p_trip_id text default null, p_toko_id text default null,
  p_link text default null, p_internal boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare host text; ch text; k text; own boolean; trip text := p_trip_id; tk text := p_toko_id;
begin
  if p_visitor is null or p_session is null or p_path is null or left(p_path,1) <> '/' then return; end if;
  if length(p_visitor) > 64 or length(p_session) > 64 or length(p_path) > 300 then return; end if;
  if p_internal then
    insert into visit_internal_visitors(visitor_id) values (p_visitor) on conflict do nothing;
  end if;
  if p_is_landing and trip is null and p_link is not null and length(p_link) <= 16 then
    select t.id::text, e->>'toko_id' into trip, tk
    from ngorder_trip t, jsonb_array_elements(t.toko) e
    where e->>'link' = p_link
    order by t.updated_at desc nulls last limit 1;
  end if;
  host := nullif(lower(substring(coalesce(p_referrer,'') from '^https?://([^/:?#]+)')), '');
  own := host is not null and host ~ '(^|\.)deera\.id$';
  if own then host := null; end if;
  ch := case when p_is_landing then classify_visit_channel(host, left(p_utm_source,80), left(p_utm_medium,80), left(p_src,40)) else 'internal' end;
  k := substring(p_path from '^/code/([^/?#]+)');
  insert into visit_events(visitor_id, session_id, path, kode, is_landing, channel, source, medium, campaign, referrer_host, device, trip_id, toko_id)
  values (p_visitor, p_session, p_path, case when k is null then null else left(replace(k,'%20',' '),60) end, p_is_landing, ch,
          left(coalesce(nullif(p_utm_source,''), p_src),80), left(p_utm_medium,80), left(p_utm_campaign,120), left(host,120), left(p_device,20),
          case when p_is_landing then left(trip,64) else null end, case when p_is_landing then left(tk,64) else null end);
end $$;
revoke all on function track_visit(text,text,text,text,text,text,text,text,boolean,text,text,text,text,boolean) from public;
grant execute on function track_visit(text,text,text,text,text,text,text,text,boolean,text,text,text,text,boolean) to anon, authenticated;

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
  with ev as (
    select v.*, exists (select 1 from visit_internal_visitors i where i.visitor_id = v.visitor_id) as internal
    from visit_events v where v.created_at >= since and v.created_at < until
  ), ext as (select * from ev where not internal), tim as (select * from ev where internal)
  select jsonb_build_object(
    'start', d1,
    'end', d2,
    'views', (select count(*) from ext),
    'visitors', (select count(distinct visitor_id) from ext),
    'sessions', (select count(*) from ext where is_landing),
    'internal', jsonb_build_object(
      'views', (select count(*) from tim),
      'visitors', (select count(distinct visitor_id) from tim),
      'sessions', (select count(*) from tim where is_landing)),
    'by_channel', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select channel, count(*) sessions, count(distinct visitor_id) visitors
        from ext where is_landing group by channel) x), '[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select coalesce(referrer_host, source, '(langsung)') as source, channel, count(*) sessions
        from ext where is_landing group by 1,2 order by 3 desc limit 15) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x order by x.date) from (
        select (created_at at time zone 'Asia/Jakarta')::date as date, count(*) filter (where is_landing) sessions, count(*) views
        from ext group by 1) x), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(x order by x.views desc) from (
        select kode, count(*) views,
          count(*) filter (where is_landing and channel in ('qr_produk','qr_struk')) qr,
          count(*) filter (where is_landing and channel = 'google') google,
          count(*) filter (where is_landing and channel = 'ai') ai
        from ext where kode is not null group by kode order by 2 desc limit 20) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;
revoke all on function get_visit_stats(date, date) from public, anon;
grant execute on function get_visit_stats(date, date) to authenticated;

create or replace function get_ngorder_trip_opens(p_trip_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;
  select coalesce(jsonb_agg(x order by x.first_opened_at), '[]'::jsonb) into res from (
    select o.toko_id,
           min(o.created_at) as first_opened_at,
           count(*) as opens,
           coalesce((select jsonb_agg(distinct v.kode) from visit_events v
                     where v.session_id in (select session_id from visit_events where trip_id = p_trip_id and toko_id = o.toko_id)
                       and v.kode is not null), '[]'::jsonb) as produk
    from visit_events o
    where o.trip_id = p_trip_id and o.toko_id is not null and o.is_landing
      and not exists (select 1 from visit_internal_visitors i where i.visitor_id = o.visitor_id)
    group by o.toko_id
  ) x;
  return res;
end $$;
revoke all on function get_ngorder_trip_opens(text) from public, anon;
grant execute on function get_ngorder_trip_opens(text) to authenticated;
