import { describe, it, expect, beforeEach } from "vitest";

describe("gtm", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete window.dataLayer;
  });
  it("initGTM memasang skrip sekali dan page_view virtual masuk dataLayer", async () => {
    const { initGTM, gtmPageView } = await import("./gtm.js?x=1");
    expect(initGTM("GTM-ABC123")).toBe(true);
    expect(initGTM("GTM-ABC123")).toBe(false);
    expect(document.head.querySelectorAll('script[src*="gtm.js?id=GTM-ABC123"]')).toHaveLength(1);
    gtmPageView("/code/D-1");
    expect(window.dataLayer.at(-1)).toMatchObject({ event: "virtual_page_view", page_path: "/code/D-1" });
  });
  it("tanpa ID tidak melakukan apa pun", async () => {
    const { initGTM, gtmPageView } = await import("./gtm.js?x=2");
    expect(initGTM("")).toBe(false);
    gtmPageView("/x"); // tidak error
  });
});
