import { describe, it, expect } from "vitest";
import { getDefaultTargetMarket, marketLabel } from "./utils";

describe("getDefaultTargetMarket", () => {
  it("Minggu -> besok Senin -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-23T12:00:00"))).toBe("cideng"); // Minggu
  });
  it("Rabu -> besok Kamis -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-19T12:00:00"))).toBe("cideng"); // Rabu
  });
  it("Kamis -> besok Jumat -> tegalgubug", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-20T12:00:00"))).toBe("tegalgubug"); // Kamis
  });
  it("Jumat -> besok Sabtu -> null (tidak ada pasar)", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-21T12:00:00"))).toBeNull(); // Jumat
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
