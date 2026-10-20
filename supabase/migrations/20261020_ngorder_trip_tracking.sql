-- Ngorder: lacak toko mana yang membuka link katalog yang dibagikan per jadwal
-- (trip_id + toko_id dibawa di querystring link, direkam di visit_events saat landing).
alter table visit_events add column if not exists trip_id text;
alter table visit_events add column if not exists toko_id text;
create index if not exists visit_events_trip_toko_idx on visit_events (trip_id, toko_id) where trip_id is not null;

create or replace function classify_visit_channel(p_ref_host text, p_utm_source text, p_utm_medium text, p_src text)
returns text language plpgsql immutable as $$
declare h text := lower(coalesce(p_ref_host, '')); s text := lower(coalesce(p_utm_source, '')); m text := lower(coalesce(p_utm_medium, '')); q text := lower(coalesce(p_src, ''));
begin
  if q = 'ngorder' then return 'ngorder'; end if;
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

drop function if exists track_visit(text,text,text,text,text,text,text,text,boolean,text);
create or replace function track_visit(
  p_visitor text, p_session text, p_path text, p_referrer text default null,
  p_utm_source text default null, p_utm_medium text default null, p_utm_campaign text default null,
  p_src text default null, p_is_landing boolean default false, p_device text default null,
  p_trip_id text default null, p_toko_id text default null)
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
  insert into visit_events(visitor_id, session_id, path, kode, is_landing, channel, source, medium, campaign, referrer_host, device, trip_id, toko_id)
  values (p_visitor, p_session, p_path, case when k is null then null else left(replace(k,'%20',' '),60) end, p_is_landing, ch,
          left(coalesce(nullif(p_utm_source,''), p_src),80), left(p_utm_medium,80), left(p_utm_campaign,120), left(host,120), left(p_device,20),
          case when p_is_landing then left(p_trip_id,64) else null end, case when p_is_landing then left(p_toko_id,64) else null end);
end $$;
revoke all on function track_visit(text,text,text,text,text,text,text,text,boolean,text,text,text) from public;
grant execute on function track_visit(text,text,text,text,text,text,text,text,boolean,text,text,text) to anon, authenticated;

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
    group by o.toko_id
  ) x;
  return res;
end $$;
revoke all on function get_ngorder_trip_opens(text) from public, anon;
grant execute on function get_ngorder_trip_opens(text) to authenticated;
