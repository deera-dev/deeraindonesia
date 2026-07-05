import { describe, it, expect } from "vitest";
import {
  LOCATIONS,
  LOCATION_LABELS,
  DAY_NAMES,
  getMarketLocation,
  getMarketLabel,
  getTodayInfo,
} from "./marketDay";

describe("konstanta lokasi & label", () => {
  it("LOCATIONS berisi gudang, cideng, tegalgubug", () => {
    expect(LOCATIONS).toEqual(["gudang", "cideng", "tegalgubug"]);
  });

  it("LOCATION_LABELS memetakan setiap lokasi ke label tampilan", () => {
    expect(LOCATION_LABELS).toEqual({
      gudang: "Gudang",
      cideng: "Cideng",
      tegalgubug: "Tegalgubug",
    });
  });

  it("DAY_NAMES berisi 7 nama hari dimulai dari Minggu", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("Minggu");
  });
});

describe("getMarketLocation", () => {
  it("Senin (1) -> cideng", () => {
    expect(getMarketLocation(new Date(2024, 0, 1))).toBe("cideng");
  });

  it("Kamis (4) -> cideng", () => {
    expect(getMarketLocation(new Date(2024, 0, 4))).toBe("cideng");
  });

  it("Jumat (5) -> tegalgubug", () => {
    expect(getMarketLocation(new Date(2024, 0, 5))).toBe("tegalgubug");
  });

  it("Selasa (2) -> gudang", () => {
    expect(getMarketLocation(new Date(2024, 0, 2))).toBe("gudang");
  });

  it("Rabu (3) -> gudang", () => {
    expect(getMarketLocation(new Date(2024, 0, 3))).toBe("gudang");
  });

  it("Sabtu (6) -> gudang", () => {
    expect(getMarketLocation(new Date(2024, 0, 6))).toBe("gudang");
  });

  it("Minggu (0) -> gudang", () => {
    expect(getMarketLocation(new Date(2024, 0, 7))).toBe("gudang");
  });

  it("default ke Date sekarang ketika tidak ada argumen", () => {
    expect(LOCATIONS).toContain(getMarketLocation());
  });
});

describe("getMarketLabel", () => {
  it("mengembalikan label untuk lokasi yang dikenal", () => {
    expect(getMarketLabel("cideng")).toBe("Cideng");
    expect(getMarketLabel("tegalgubug")).toBe("Tegalgubug");
    expect(getMarketLabel("gudang")).toBe("Gudang");
  });

  it("fallback ke nilai loc itu sendiri untuk lokasi tidak dikenal", () => {
    expect(getMarketLabel("antartika")).toBe("antartika");
  });
});

describe("getTodayInfo", () => {
  it("mengembalikan shape {loc, label, day} yang konsisten", () => {
    const info = getTodayInfo();
    expect(LOCATIONS).toContain(info.loc);
    expect(info.label).toBe(LOCATION_LABELS[info.loc]);
    expect(DAY_NAMES).toContain(info.day);
  });
});
