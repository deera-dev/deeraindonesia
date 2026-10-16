/**
 * gtm.js — Google Tag Manager (opsional). Aktif bila VITE_GTM_ID (GTM-XXXXXXX) diisi.
 * Bila GTM aktif, GA4 sebaiknya dipasang DI DALAM GTM (tag GA4 Configuration) — kode ini
 * otomatis tidak memasang gtag.js langsung supaya page_view tidak terhitung dobel.
 */
// ID container bersifat publik; bisa ditimpa lewat env VITE_GTM_ID.
export const GTM_ID = "GTM-NQMGGHRL";

let ready = false;

export function initGTM(id) {
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

export const isGTMReady = () => ready;

/** SPA: kirim page_view virtual tiap perpindahan halaman ke dataLayer (dipakai trigger di GTM). */
export function gtmPageView(path) {
  if (!ready) return;
  window.dataLayer.push({
    event: "virtual_page_view",
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
