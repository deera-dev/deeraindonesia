import { describe, it, expect } from "vitest";
import { effectiveQty, itemProfit, formatTime, getStokWarna, getTotalStokVariant } from "./salesUtils";

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
