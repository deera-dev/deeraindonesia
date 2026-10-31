import { env } from "../../env";
import { gaEvent } from "./ga";
import { gtmEvent } from "./gtm";

export const EVENTS = ["view_product", "click_wa", "share_product", "scan_qr"];

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window === "undefined" || env.DEV) return;
    if (!gtmEvent(name, params)) gaEvent(name, params);
  } catch {}
}
