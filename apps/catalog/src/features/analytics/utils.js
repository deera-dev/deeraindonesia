/** features/analytics/utils.js — pure helpers. */

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|pagespeed/i;

export function isBot(ua = "", webdriver = false) {
  return !!webdriver || BOT_RE.test(ua);
}

export function deviceType(ua = "") {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Ambil parameter sumber dari query string: utm_*, src. */
export function parseSourceParams(search = "") {
  const p = new URLSearchParams(search);
  return {
    utmSource: p.get("utm_source"),
    utmMedium: p.get("utm_medium"),
    utmCampaign: p.get("utm_campaign"),
    src: p.get("src"),
  };
}

/** Path yang dicatat: tanpa query/hash. "/" dan "/q/…" tidak dicatat (hanya redirect). */
export function trackablePath(pathname) {
  if (!pathname || pathname === "/" || pathname.startsWith("/q/")) return null;
  return pathname;
}

/** ID sesi baru untuk tiap pemuatan halaman. */
export function newSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random().toString(16).slice(2)}`;
}
