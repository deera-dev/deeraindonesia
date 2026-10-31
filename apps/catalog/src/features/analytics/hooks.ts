import { isInternalDevice } from "@deera/shared/lib/internalDevice";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { env } from "../../env";
import { trackVisit } from "./api";
import { trackEvent } from "./events";
import { GA_MEASUREMENT_ID, gaPageView, initGA } from "./ga";
import { GTM_ID, gtmPageView, initGTM } from "./gtm";
import { useVisitorStore } from "./store";
import {
  deviceType,
  isBot,
  newSessionId,
  parseSourceParams,
  shortLinkCode,
  trackablePath,
  wantsInternalMark,
} from "./utils";

export { trackEvent };

interface Landing {
  referrer: string | null;
  src?: string | null;
  link?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  tripId?: string | null;
  tokoId?: string | null;
}

const SESSION_ID = newSessionId();
const LANDING: Landing =
  typeof window !== "undefined"
    ? {
        referrer: document.referrer || null,
        ...parseSourceParams(window.location.search),
        ...(window.location.pathname.startsWith("/q/") ? { src: "qr" } : {}),
        ...(window.location.pathname === "/s" ? { src: "struk" } : {}),
        ...(window.location.pathname.startsWith("/j/") ? { src: "kartu_jahit" } : {}),
        ...(shortLinkCode(window.location.pathname)
          ? { src: "ngorder", link: shortLinkCode(window.location.pathname) }
          : {}),
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
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!initGTM(env.VITE_GTM_ID || GTM_ID))
      initGA(env.VITE_GA_MEASUREMENT_ID || GA_MEASUREMENT_ID);
  }, []);

  useEffect(() => {
    const path = trackablePath(pathname);
    if (!path || last.current === path) return;
    last.current = path;
    if (env.DEV) return;
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
    if (
      isLanding &&
      (LANDING.src === "qr" || LANDING.src === "struk" || LANDING.src === "kartu_jahit")
    ) {
      trackEvent("scan_qr", { qr_source: LANDING.src });
    }
  }, [pathname]);
}
