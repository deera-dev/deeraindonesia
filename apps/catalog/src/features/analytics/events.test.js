import { beforeEach, describe, expect, it, vi } from "vitest";

describe("trackEvent", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete window.dataLayer;
    vi.resetModules();
    vi.stubEnv("DEV", false);
  });
  it("GTM aktif → event masuk dataLayer dengan parameter", async () => {
    const { initGTM } = await import("./gtm.js");
    const { trackEvent } = await import("./events.js");
    initGTM("GTM-ABC123");
    trackEvent("click_wa", { kode: "D-1", place: "detail" });
    expect(window.dataLayer.at(-1)).toEqual({ event: "click_wa", kode: "D-1", place: "detail" });
  });
  it("tanpa GTM, GA aktif → gtag event", async () => {
    const { initGA } = await import("./ga.js");
    const { trackEvent } = await import("./events.js");
    initGA("G-TEST");
    trackEvent("share_product", { kode: "D-2" });
    const last = Array.from(window.dataLayer.at(-1));
    expect(last).toEqual(["event", "share_product", { kode: "D-2" }]);
  });
  it("tidak ada GTM/GA → diam, tanpa error", async () => {
    const { trackEvent } = await import("./events.js");
    expect(() => trackEvent("click_wa")).not.toThrow();
  });
});
