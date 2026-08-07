import { describe, it, expect } from "vitest";
import { fmtDate, groupSaleItems } from "./utils";

describe("fmtDate", () => {
  it("formats a date string as long Indonesian date", () => {
    expect(fmtDate("2026-08-07")).toBe("07 Agustus 2026");
  });

  it("returns '-' for null/undefined", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate(undefined)).toBe("-");
  });
});

describe("groupSaleItems", () => {
  it("returns [] for null/undefined items", () => {
    expect(groupSaleItems(null)).toEqual([]);
    expect(groupSaleItems(undefined)).toEqual([]);
  });

  it("handles flat items (no warna) using item.qty", () => {
    const items = [{ kode: "D-07-OSK", size: "Midi", harga: 150000, hpp: 80000, qty: 3 }];
    const rows = groupSaleItems(items);
    expect(rows).toEqual([
      {
        kode: "D-07-OSK",
        size: "Midi",
        harga: 150000,
        hpp: 80000,
        qty: 3,
        subtotal: 450000,
        warnaBreakdown: [],
      },
    ]);
  });

  it("sums qty across warna and builds warnaBreakdown", () => {
    const items = [
      {
        kode: "D-82-SFN",
        size: "Gamis",
        harga: 200000,
        hpp: 90000,
        warna: [
          { nama: "HITAM", qty: 2 },
          { nama: "MERAH", qty: 1 },
        ],
      },
    ];
    const rows = groupSaleItems(items);
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(3);
    expect(rows[0].subtotal).toBe(600000);
    expect(rows[0].warnaBreakdown).toEqual([
      { warna: "HITAM", qty: 2 },
      { warna: "MERAH", qty: 1 },
    ]);
  });

  it("treats empty warna array as flat (fallback to item.qty)", () => {
    const items = [{ kode: "D-01-ABC", size: "Midi", harga: 100000, hpp: 50000, qty: 2, warna: [] }];
    const rows = groupSaleItems(items);
    expect(rows[0].qty).toBe(2);
    expect(rows[0].warnaBreakdown).toEqual([]);
  });

  it("preserves one row per item (no split for multi-warna)", () => {
    const items = [
      { kode: "A", size: "Midi", harga: 1000, warna: [{ nama: "X", qty: 1 }] },
      { kode: "B", size: "Gamis", harga: 2000, qty: 5 },
    ];
    const rows = groupSaleItems(items);
    expect(rows).toHaveLength(2);
  });
});
