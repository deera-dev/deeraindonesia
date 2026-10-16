-- Analytics katalog: pencatatan kunjungan + klasifikasi sumber (semua logika di backend).
create table if not exists visit_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null,
  session_id text not null,
  path text not null,
  kode text,
  is_landing boolean not null default false,
  channel text not null default 'direct',
  source text,
  medium text,
  campaign text,
  referrer_host text,
  device text
);
create index if not exists visit_events_created_idx on visit_events (created_at desc);
create index if not exists visit_events_kode_idx on visit_events (kode) where kode is not null;
alter table visit_events enable row level security;
-- Tanpa policy: anon/authenticated tidak bisa baca/tulis langsung; hanya lewat RPC security definer.

create or replace function classify_visit_channel(p_ref_host text, p_utm_source text, p_utm_medium text, p_src text)
returns text language plpgsql immutable as $$
declare h text := lower(coalesce(p_ref_host, '')); s text := lower(coalesce(p_utm_source, '')); m text := lower(coalesce(p_utm_medium, '')); q text := lower(coalesce(p_src, ''));
begin
  if q = 'struk' then return 'qr_struk'; end if;
  if q in ('qr','barcode') or m in ('qr','barcode') or s in ('qr','barcode') then return 'qr_produk'; end if;
  if s ~ '(chatgpt|openai|perplexity|claude|gemini|copilot|deepseek|grok|poe|you\.com|meta\.ai|phind)' or
     h ~ '(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|deepseek\.com|chat\.deepseek\.com|poe\.com|meta\.ai|grok\.com|phind\.com)$' then return 'ai'; end if;
  if h ~ '(^|\.)google\.[a-z.]+$' or s = 'google' then return case when m in ('cpc','ppc','paid') then 'iklan' else 'google' end; end if;
  if h ~ '(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|baidu\.com|yandex\.[a-z]+|search\.brave\.com)$' or s in ('bing','duckduckgo','yahoo') then return 'mesin_cari_lain'; end if;
  if h ~ '(^|\.)(instagram\.com)$' or s in ('instagram','ig') then return 'instagram'; end if;
  if h ~ '(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com)$' or s in ('facebook','fb') then return 'facebook'; end if;
  if h ~ '(^|\.)(tiktok\.com)$' or s = 'tiktok' then return 'tiktok'; end if;
  if h ~ '(^|\.)(wa\.me|whatsapp\.com|api\.whatsapp\.com)$' or s in ('whatsapp','wa') then return 'whatsapp'; end if;
  if h ~ '(^|\.)(youtube\.com|youtu\.be)$' or s = 'youtube' then return 'youtube'; end if;
  if h ~ '(^|\.)(t\.co|twitter\.com|x\.com)$' or s in ('twitter','x') then return 'twitter'; end if;
  if h ~ '(^|\.)(shopee\.co\.id|tokopedia\.com|lazada\.co\.id)$' then return 'marketplace'; end if;
  if h = '' and s = '' then return 'direct'; end if;
  return 'lainnya';
end $$;

create or replace function track_visit(
  p_visitor text, p_session text, p_path text, p_referrer text default null,
  p_utm_source text default null, p_utm_medium text default null, p_utm_campaign text default null,
  p_src text default null, p_is_landing boolean default false, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
declare host text; ch text; k text; own boolean;
begin
  if p_visitor is null or p_session is null or p_path is null or left(p_path,1) <> '/' then return; end if;
  if length(p_visitor) > 64 or length(p_session) > 64 or length(p_path) > 300 then return; end if;
  host := nullif(lower(substring(coalesce(p_referrer,'') from '^https?://([^/:?#]+)')), '');
  own := host is not null and host ~ '(^|\.)deera\.id$';
  if own then host := null; end if;
  ch := case when p_is_landing then classify_visit_channel(host, left(p_utm_source,80), left(p_utm_medium,80), left(p_src,40)) else 'internal' end;
  k := substring(p_path from '^/code/([^/?#]+)');
  insert into visit_events(visitor_id, session_id, path, kode, is_landing, channel, source, medium, campaign, referrer_host, device)
  values (p_visitor, p_session, p_path, case when k is null then null else left(replace(k,'%20',' '),60) end, p_is_landing, ch,
          left(coalesce(nullif(p_utm_source,''), p_src),80), left(p_utm_medium,80), left(p_utm_campaign,120), left(host,120), left(p_device,20));
end $$;
revoke all on function track_visit(text,text,text,text,text,text,text,text,boolean,text) from public;
grant execute on function track_visit(text,text,text,text,text,text,text,text,boolean,text) to anon, authenticated;

create or replace function get_visit_stats(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days,30), 365)));
        res jsonb;
begin
  if auth.role() <> 'authenticated' then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'days', p_days,
    'views', (select count(*) from visit_events where created_at >= since),
    'visitors', (select count(distinct visitor_id) from visit_events where created_at >= since),
    'sessions', (select count(*) from visit_events where created_at >= since and is_landing),
    'by_channel', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select channel, count(*) sessions, count(distinct visitor_id) visitors
        from visit_events where created_at >= since and is_landing group by channel) x), '[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select coalesce(referrer_host, source, '(langsung)') as source, channel, count(*) sessions
        from visit_events where created_at >= since and is_landing group by 1,2 order by 3 desc limit 15) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x order by x.date) from (
        select (created_at at time zone 'Asia/Jakarta')::date as date, count(*) filter (where is_landing) sessions, count(*) views
        from visit_events where created_at >= since group by 1) x), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(x order by x.views desc) from (
        select kode, count(*) views,
          count(*) filter (where is_landing and channel in ('qr_produk','qr_struk')) qr,
          count(*) filter (where is_landing and channel = 'google') google,
          count(*) filter (where is_landing and channel = 'ai') ai
        from visit_events where created_at >= since and kode is not null group by kode order by 2 desc limit 20) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;
revoke all on function get_visit_stats(int) from public, anon;
grant execute on function get_visit_stats(int) to authenticated;
