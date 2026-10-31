export const GA_MEASUREMENT_ID = "G-DWD1V0KHKK";

let ready = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initGA(id: string): boolean {
  if (!id || ready || typeof document === "undefined") return false;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });
  ready = true;
  return true;
}

export function gaPageView(path: string): void {
  if (!ready || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function gaEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!ready || !window.gtag) return;
  window.gtag("event", name, params);
}
