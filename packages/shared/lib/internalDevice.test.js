import { describe, it, expect, beforeEach } from "vitest";
import { cookieDomain, markInternalDevice, isInternalDevice, INTERNAL_COOKIE } from "./internalDevice";

describe("internalDevice", () => {
  beforeEach(() => {
    document.cookie = `${INTERNAL_COOKIE}=; max-age=0; path=/`;
  });
  it("cookieDomain hanya untuk *.deera.id", () => {
    expect(cookieDomain("admin.deera.id")).toBe(".deera.id");
    expect(cookieDomain("deera.id")).toBe(".deera.id");
    expect(cookieDomain("localhost")).toBeNull();
    expect(cookieDomain("deera.id.evil.com")).toBeNull();
  });
  it("menulis cookie lintas subdomain di produksi", () => {
    const doc = { cookie: "" };
    markInternalDevice(doc, "pos.deera.id");
    expect(doc.cookie).toContain(`${INTERNAL_COOKIE}=1`);
    expect(doc.cookie).toContain("domain=.deera.id");
    expect(doc.cookie).toContain("Secure");
  });
  it("menandai & membaca perangkat (localhost tanpa domain)", () => {
    expect(isInternalDevice()).toBe(false);
    markInternalDevice(document, "localhost");
    expect(isInternalDevice()).toBe(true);
  });
  it("tidak salah baca cookie lain", () => {
    expect(isInternalDevice({ cookie: "x_deera_tim=1; deera_timx=1" })).toBe(false);
    expect(isInternalDevice({ cookie: "a=b; deera_tim=1" })).toBe(true);
  });
});
