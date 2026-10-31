export const GTM_ID = "GTM-NQMGGHRL";

let ready = false;

export function initGTM(id: string): boolean {
  if (!id || ready || typeof document === "undefined") return false;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  ready = true;
  return true;
}

export const isGTMReady = (): boolean => ready;

export function gtmPageView(path: string): void {
  if (!ready) return;
  window.dataLayer?.push({
    event: "virtual_page_view",
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function gtmEvent(name: string, params: Record<string, unknown> = {}): boolean {
  if (!ready) return false;
  window.dataLayer?.push({ event: name, ...params });
  return true;
}
