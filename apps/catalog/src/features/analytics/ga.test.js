import { beforeEach, describe, expect, it } from "vitest";

describe("ga", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete window.gtag;
    delete window.dataLayer;
  });
  it("initGA memasang skrip gtag sekali dan page_view dikirim", async () => {
    const { initGA, gaPageView, GA_MEASUREMENT_ID } = await import("./ga.js?x=1");
    expect(GA_MEASUREMENT_ID).toBe("G-DWD1V0KHKK");
    expect(initGA(GA_MEASUREMENT_ID)).toBe(true);
    expect(initGA(GA_MEASUREMENT_ID)).toBe(false);
    expect(document.head.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);
    gaPageView("/code/D-1");
    const events = window.dataLayer.map((a) => a[0]);
    expect(events).toContain("config");
    expect(window.dataLayer.some((a) => a[0] === "event" && a[1] === "page_view")).toBe(true);
  });
  it("initGA tanpa ID tidak melakukan apa pun", async () => {
    const { initGA } = await import("./ga.js?x=2");
    expect(initGA("")).toBe(false);
  });
});
