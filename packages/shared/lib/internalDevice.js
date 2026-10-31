export const INTERNAL_COOKIE = "deera_tim";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function cookieDomain(hostname = globalThis.location?.hostname ?? "") {
  return /(^|\.)deera\.id$/.test(hostname) ? ".deera.id" : null;
}

export function markInternalDevice(
  doc = globalThis.document,
  hostname = globalThis.location?.hostname,
) {
  if (!doc) return false;
  const domain = cookieDomain(hostname);
  const parts = [`${INTERNAL_COOKIE}=1`, "path=/", `max-age=${ONE_YEAR}`, "SameSite=Lax"];
  if (domain) parts.push(`domain=${domain}`, "Secure");
  doc.cookie = parts.join("; ");
  return true;
}

export function isInternalDevice(doc = globalThis.document) {
  return !!doc && new RegExp(`(?:^|;\\s*)${INTERNAL_COOKIE}=1(?:;|$)`).test(doc.cookie ?? "");
}
