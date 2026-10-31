const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|pagespeed/i;

export function isBot(ua = "", webdriver = false): boolean {
  return !!webdriver || BOT_RE.test(ua);
}

export function deviceType(ua = ""): "tablet" | "mobile" | "desktop" {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export interface SourceParams {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  src: string | null;
  tripId: string | null;
  tokoId: string | null;
}

export function parseSourceParams(search = ""): SourceParams {
  const p = new URLSearchParams(search);
  return {
    utmSource: p.get("utm_source"),
    utmMedium: p.get("utm_medium"),
    utmCampaign: p.get("utm_campaign"),
    src: p.get("src"),
    tripId: p.get("trip_id"),
    tokoId: p.get("toko_id"),
  };
}

export function trackablePath(pathname: string | null | undefined): string | null {
  if (
    !pathname ||
    pathname === "/" ||
    pathname === "/s" ||
    pathname.startsWith("/q/") ||
    pathname.startsWith("/j/") ||
    pathname.startsWith("/t/")
  )
    return null;
  return pathname;
}

export function shortLinkCode(pathname = ""): string | null {
  const m = /^\/t\/([A-Za-z0-9]{1,16})\/?$/.exec(pathname);
  return m ? m[1]!.toLowerCase() : null;
}

export function wantsInternalMark(search = ""): boolean {
  return new URLSearchParams(search).get("tim") === "1";
}

export function newSessionId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random().toString(16).slice(2)}`
  );
}
