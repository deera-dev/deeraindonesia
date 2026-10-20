
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|pagespeed/i;

export function isBot(ua = "", webdriver = false) {
  return !!webdriver || BOT_RE.test(ua);
}

export function deviceType(ua = "") {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export function parseSourceParams(search = "") {
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

export function trackablePath(pathname) {
  if (!pathname || pathname === "/" || pathname === "/s" || pathname.startsWith("/q/")) return null;
  return pathname;
}

export function newSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random().toString(16).slice(2)}`;
}
