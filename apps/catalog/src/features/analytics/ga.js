export const GA_MEASUREMENT_ID = "G-DWD1V0KHKK";

let ready = false;

export function initGA(id) {
  if (!id || ready || typeof document === "undefined") return false;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });
  ready = true;
  return true;
}

export function gaPageView(path) {
  if (!ready || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function gaEvent(name, params = {}) {
  if (!ready || !window.gtag) return;
  window.gtag("event", name, params);
}
