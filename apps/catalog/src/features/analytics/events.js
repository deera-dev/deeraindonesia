import { gtmEvent } from "./gtm";
import { gaEvent } from "./ga";

export const EVENTS = ["view_product", "click_wa", "share_product", "scan_qr"];

export function trackEvent(name, params = {}) {
  try {
    if (typeof window === "undefined" || import.meta.env.DEV) return;
    if (!gtmEvent(name, params)) gaEvent(name, params);
  } catch {
  }
}
