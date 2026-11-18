import { describe, it, expect } from "vitest";
import { getDefaultTargetMarket, marketLabel, restockItemKey, DEFAULT_TARGET_SERI } from "./utils";

describe("getDefaultTargetMarket", () => {
  it("Minggu -> besok Senin -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-23T12:00:00"))).toBe("cideng");
  });
  it("Rabu -> besok Kamis -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-19T12:00:00"))).toBe("cideng");
  });
  it("Kamis -> besok Jumat -> tegalgubug", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-20T12:00:00"))).toBe("tegalgubug");
  });
  it("Jumat -> besok Sabtu -> null (tidak ada pasar)", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-21T12:00:00"))).toBeNull();
  });
});

describe("marketLabel", () => {
  it("cideng -> Cideng, tegalgubug -> Tegalgubug", () => {
    expect(marketLabel("cideng")).toBe("Cideng");
    expect(marketLabel("tegalgubug")).toBe("Tegalgubug");
  });
  it("unknown -> '-'", () => {
    expect(marketLabel("gudang")).toBe("-");
    expect(marketLabel(null)).toBe("-");
  });
});

describe("DEFAULT_TARGET_SERI", () => {
  it("cideng=2, tegalgubug=3 (admin: minimal seri cideng 2, tegalgubuk 3)", () => {
    expect(DEFAULT_TARGET_SERI).toEqual({ cideng: 2, tegalgubug: 3 });
  });
});

describe("restockItemKey", () => {
  it("menggabungkan kode__size__warna", () => {
    expect(restockItemKey("D-01-OSK", "Midi", "HITAM")).toBe("D-01-OSK__Midi__HITAM");
  });
});
