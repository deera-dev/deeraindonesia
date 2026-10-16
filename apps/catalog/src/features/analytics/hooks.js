/**
 * features/analytics/hooks.js — public surface: usePageTracking() dipasang sekali
 * di dalam <BrowserRouter>. Catat tiap perpindahan halaman; kunjungan pertama
 * (landing) membawa referrer + parameter utm/src.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackVisit } from "./api";
import { useVisitorStore } from "./store";
import { isBot, deviceType, parseSourceParams, trackablePath, newSessionId } from "./utils";
import { initGA, gaPageView } from "./ga";

// Ditangkap SEKALI saat modul dimuat (sebelum redirect "/" → "/catalog" menghapus query).
const SESSION_ID = newSessionId();
const LANDING =
  typeof window !== "undefined"
    ? {
        referrer: document.referrer || null,
        ...parseSourceParams(window.location.search),
        // QR di label produk: /q/KODE → dihitung sebagai sumber "qr_produk" oleh backend.
        ...(window.location.pathname.startsWith("/q/") ? { src: "qr" } : {}),
      }
    : { referrer: null };

let landed = false;

export function usePageTracking() {
  const { pathname } = useLocation();
  const last = useRef(null);

  useEffect(() => {
    initGA(import.meta.env.VITE_GA_MEASUREMENT_ID);
  }, []);

  useEffect(() => {
    const path = trackablePath(pathname);
    if (!path || last.current === path) return;
    last.current = path;
    if (import.meta.env.DEV) return;
    const ua = navigator.userAgent;
    if (isBot(ua, navigator.webdriver)) return;

    const isLanding = !landed;
    landed = true;
    const visitor = useVisitorStore.getState().ensureVisitorId();
    trackVisit({
      visitor,
      session: SESSION_ID,
      path,
      isLanding,
      device: deviceType(ua),
      ...(isLanding ? LANDING : {}),
    }).catch(() => {}); // pelacakan tidak boleh mengganggu pengunjung
    gaPageView(path);
  }, [pathname]);
}
