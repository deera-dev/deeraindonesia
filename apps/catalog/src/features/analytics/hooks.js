import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackVisit } from "./api";
import { useVisitorStore } from "./store";
import { isBot, deviceType, parseSourceParams, trackablePath, newSessionId, shortLinkCode, wantsInternalMark } from "./utils";
import { isInternalDevice } from "@deera/shared/lib/internalDevice";
import { initGA, gaPageView, GA_MEASUREMENT_ID } from "./ga";
import { initGTM, gtmPageView, GTM_ID } from "./gtm";
import { trackEvent } from "./events";

export { trackEvent };

const SESSION_ID = newSessionId();
const LANDING =
  typeof window !== "undefined"
    ? {
        referrer: document.referrer || null,
        ...parseSourceParams(window.location.search),
        ...(window.location.pathname.startsWith("/q/") ? { src: "qr" } : {}),
        ...(window.location.pathname === "/s" ? { src: "struk" } : {}),
        ...(window.location.pathname.startsWith("/j/") ? { src: "kartu_jahit" } : {}),
        ...(shortLinkCode(window.location.pathname) ? { src: "ngorder", link: shortLinkCode(window.location.pathname) } : {}),
      }
    : { referrer: null };

const MARK_TIM = typeof window !== "undefined" && wantsInternalMark(window.location.search);

let landed = false;

function syncInternalFlag() {
  if (typeof window === "undefined") return false;
  const store = useVisitorStore.getState();
  if (!store.internal && (MARK_TIM || isInternalDevice())) store.markInternal();
  return useVisitorStore.getState().internal;
}

export function usePageTracking() {
  const { pathname } = useLocation();
  const last = useRef(null);

  useEffect(() => {
    if (!initGTM(import.meta.env.VITE_GTM_ID || GTM_ID)) initGA(import.meta.env.VITE_GA_MEASUREMENT_ID || GA_MEASUREMENT_ID);
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
    const internal = syncInternalFlag();
    trackVisit({
      visitor,
      session: SESSION_ID,
      path,
      isLanding,
      device: deviceType(ua),
      internal,
      ...(isLanding ? LANDING : {}),
    }).catch(() => {});
    gaPageView(path);
    gtmPageView(path);
    if (isLanding && (LANDING.src === "qr" || LANDING.src === "struk" || LANDING.src === "kartu_jahit")) {
      trackEvent("scan_qr", { qr_source: LANDING.src });
    }
  }, [pathname]);
}
