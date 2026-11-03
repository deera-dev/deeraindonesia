-- classify_visit_channel: fallback ke 'direct' sebelumnya cuma cek referrer host
-- (h) dan utm_source (s) kosong, tanpa cek src (q) — jadi sumber yang cuma
-- ditandai lewat src (mis. kartu_jahit dari /j/, tanpa host/utm) salah
-- kebawa masuk 'direct' alih-alih 'lainnya'. QR struk/produk tidak kena
-- (sudah ada cabang eksplisit duluan), tapi kartu_jahit & src custom lain ke depannya
-- ikut rentan — sekalian diperbaiki di sini.
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
  if h = '' and s = '' and q = '' then return 'direct'; end if;
  return 'lainnya';
end $$;
