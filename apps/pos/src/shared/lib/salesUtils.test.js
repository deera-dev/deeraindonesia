import { describe, it, expect } from "vitest";
import {
  effectiveQty,
  itemProfit,
  formatTime,
  getStokWarna,
  getTotalStokVariant,
  getStokAllLocations,
  getCombinedStok,
  getCombinedStokVariant,
  allocateAcrossLocations,
  getSaleLocationBreakdown,
  formatSaleLocationBreakdown,
} from "./salesUtils";

describe("effectiveQty", () => {
  it("sums warna qty when warna is array", () => {
    const item = { warna: [{ qty: 3 }, { qty: 2 }], qty: 1 };
    expect(effectiveQty(item)).toBe(5);
  });

  it("returns item.qty when warna is not array", () => {
    expect(effectiveQty({ qty: 4 })).toBe(4);
  });

  it("returns item.qty when warna is empty array", () => {
    expect(effectiveQty({ warna: [], qty: 4 })).toBe(4);
  });

  it("returns 0 when qty is undefined", () => {
    expect(effectiveQty({})).toBe(0);
  });

  it("handles warna array with undefined qty", () => {
    expect(effectiveQty({ warna: [{ qty: undefined }, { qty: 2 }] })).toBe(2);
  });
});

describe("itemProfit", () => {
  it("calculates (harga - hpp) * qty", () => {
    expect(itemProfit({ harga: 100000, hpp: 60000, qty: 2 })).toBe(80000);
  });

  it("handles warna-based qty", () => {
    expect(itemProfit({ harga: 100000, hpp: 50000, warna: [{ qty: 3 }, { qty: 2 }] })).toBe(250000);
  });

  it("returns 0 when hpp equals harga", () => {
    expect(itemProfit({ harga: 100000, hpp: 100000, qty: 1 })).toBe(0);
  });

  it("defaults harga and hpp to 0 when missing", () => {
    expect(itemProfit({ qty: 1 })).toBe(0);
  });
});

describe("formatTime", () => {
  it("returns '—' for null", () => {
    expect(formatTime(null)).toBe("—");
  });

  it("returns formatted string for valid ISO", () => {
    const result = formatTime("2026-07-04T08:30:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });
});

describe("getStokWarna", () => {
  it("returns stok for given size/warna/loc", () => {
    const product = {
      stokByWarna: { Midi: { HITAM: { gudang: 5 } } },
    };
    expect(getStokWarna(product, "Midi", "HITAM", "gudang")).toBe(5);
  });

  it("returns 0 when path does not exist", () => {
    expect(getStokWarna({}, "Midi", "HITAM", "gudang")).toBe(0);
  });

  it("returns 0 for missing warna", () => {
    const product = { stokByWarna: { Midi: {} } };
    expect(getStokWarna(product, "Midi", "MERAH", "gudang")).toBe(0);
  });
});

describe("getTotalStokVariant", () => {
  it("sums all warna stok for size/loc", () => {
    const product = {
      stokByWarna: {
        Midi: {
          HITAM: { gudang: 3 },
          MERAH: { gudang: 2 },
        },
      },
    };
    expect(getTotalStokVariant(product, "Midi", "gudang")).toBe(5);
  });

  it("returns 0 for missing size", () => {
    expect(getTotalStokVariant({}, "Midi", "gudang")).toBe(0);
  });
});
describe("getStokAllLocations", () => {
  it("returns per-location stok map for a warna", () => {
    const product = { stokByWarna: { Midi: { HITAM: { gudang: 4, cideng: 2, tegalgubug: 0 } } } };
    expect(getStokAllLocations(product, "Midi", "HITAM")).toEqual({ gudang: 4, cideng: 2, tegalgubug: 0 });
  });

  it("returns zeroed map when path does not exist", () => {
    expect(getStokAllLocations({}, "Midi", "HITAM")).toEqual({ gudang: 0, cideng: 0, tegalgubug: 0 });
  });
});

describe("getCombinedStok", () => {
  it("sums stok across all 3 locations for a warna", () => {
    const product = { stokByWarna: { Midi: { HITAM: { gudang: 4, cideng: 2, tegalgubug: 1 } } } };
    expect(getCombinedStok(product, "Midi", "HITAM")).toBe(7);
  });

  it("returns 0 when path does not exist", () => {
    expect(getCombinedStok({}, "Midi", "HITAM")).toBe(0);
  });
});

describe("getCombinedStokVariant", () => {
  it("sums combined stok across all warna for a size", () => {
    const product = {
      stokByWarna: {
        Midi: {
          HITAM: { gudang: 4, cideng: 2, tegalgubug: 0 },
          MERAH: { gudang: 1, cideng: 0, tegalgubug: 3 },
        },
      },
    };
    expect(getCombinedStokVariant(product, "Midi")).toBe(10);
  });

  it("works for colorless product (warna key '_')", () => {
    const product = { stokByWarna: { Midi: { _: { gudang: 5, cideng: 1, tegalgubug: 0 } } } };
    expect(getCombinedStokVariant(product, "Midi")).toBe(6);
  });

  it("returns 0 for missing size", () => {
    expect(getCombinedStokVariant({}, "Midi")).toBe(0);
  });
});

describe("allocateAcrossLocations", () => {
  it("fills primary location first, then spills into other locations in LOCATIONS order", () => {
    // gudang has 4, cideng has 2 — want 6 with primary=gudang
    const result = allocateAcrossLocations({
      stokByLoc: { gudang: 4, cideng: 2, tegalgubug: 0 },
      primaryLocation: "gudang",
      currentBreakdown: [],
      want: 6,
    });
    expect(result).toEqual([
      { location: "gudang", qty: 4 },
      { location: "cideng", qty: 2 },
    ]);
  });

  it("caps each location at its own stok even if want is higher", () => {
    const result = allocateAcrossLocations({
      stokByLoc: { gudang: 2, cideng: 1, tegalgubug: 0 },
      primaryLocation: "gudang",
      currentBreakdown: [],
      want: 10,
    });
    expect(result).toEqual([
      { location: "gudang", qty: 2 },
      { location: "cideng", qty: 1 },
    ]);
  });

  it("preserves existing breakdown and only tops up the shortfall", () => {
    const result = allocateAcrossLocations({
      stokByLoc: { gudang: 4, cideng: 2, tegalgubug: 0 },
      primaryLocation: "gudang",
      currentBreakdown: [{ location: "gudang", qty: 3 }],
      want: 5,
    });
    // 3 already in gudang, +1 more room in gudang (cap 4) = 4, remaining 1 -> cideng
    expect(result).toEqual([
      { location: "gudang", qty: 4 },
      { location: "cideng", qty: 1 },
    ]);
  });

  it("decreasing want removes from non-primary locations first", () => {
    const result = allocateAcrossLocations({
      stokByLoc: { gudang: 4, cideng: 2, tegalgubug: 0 },
      primaryLocation: "gudang",
      currentBreakdown: [
        { location: "gudang", qty: 4 },
        { location: "cideng", qty: 2 },
      ],
      want: 5,
    });
    // total was 6, want 5 -> remove 1 from cideng (non-primary) first
    expect(result).toEqual([
      { location: "gudang", qty: 4 },
      { location: "cideng", qty: 1 },
    ]);
  });

  it("decreasing want removes primary only after all non-primary exhausted", () => {
    const result = allocateAcrossLocations({
      stokByLoc: { gudang: 4, cideng: 2, tegalgubug: 0 },
      primaryLocation: "gudang",
      currentBreakdown: [
        { location: "gudang", qty: 4 },
        { location: "cideng", qty: 2 },
      ],
      want: 3,
    });
    // total was 6, want 3 -> remove 2 from cideng, then 1 from gudang
    expect(result).toEqual([{ location: "gudang", qty: 3 }]);
  });

  it("filters out zero-qty locations from result", () => {
    const result = allocateAcrossLocations({
      stokByLoc: { gudang: 4, cideng: 0, tegalgubug: 0 },
      primaryLocation: "gudang",
      currentBreakdown: [],
      want: 2,
    });
    expect(result).toEqual([{ location: "gudang", qty: 2 }]);
  });
});

describe("getSaleLocationBreakdown", () => {
  it("groups negative-delta adjustments per location", () => {
    const sale = {
      stok_adjustments: [
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -4 },
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: -2 },
      ],
    };
    expect(getSaleLocationBreakdown(sale)).toEqual({ gudang: 4, cideng: 2 });
  });

  it("ignores positive-delta adjustments (retur)", () => {
    const sale = {
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: 4 }],
    };
    expect(getSaleLocationBreakdown(sale)).toEqual({});
  });

  it("returns {} when no stok_adjustments", () => {
    expect(getSaleLocationBreakdown({})).toEqual({});
  });

  it("returns {} when sale is null/undefined", () => {
    expect(getSaleLocationBreakdown(null)).toEqual({});
  });
});

describe("formatSaleLocationBreakdown", () => {
  it("returns formatted label when sale spans multiple locations", () => {
    const sale = {
      stok_adjustments: [
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -4 },
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: -2 },
      ],
    };
    expect(formatSaleLocationBreakdown(sale)).toBe("Gudang 4 · Cideng 2");
  });

  it("returns null when sale is from a single location (regression)", () => {
    const sale = {
      stok_adjustments: [
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -6 },
      ],
    };
    expect(formatSaleLocationBreakdown(sale)).toBeNull();
  });

  it("returns null when no stok_adjustments", () => {
    expect(formatSaleLocationBreakdown({})).toBeNull();
  });

  it("orders locations by LOCATIONS constant order regardless of adjustment order", () => {
    const sale = {
      stok_adjustments: [
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "tegalgubug", delta: -1 },
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -3 },
      ],
    };
    expect(formatSaleLocationBreakdown(sale)).toBe("Gudang 3 · Tegalgubug 1");
  });
});
