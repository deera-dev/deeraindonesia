import { describe, it, expect } from "vitest";
import { SIZE_ORDER, sortRows, kodeNum, rowKey, selisihCls, selisihLabel, flattenVariantMap } from "./utils";

describe("SIZE_ORDER", () => {
  it("urutan Midi < Midi Jumbo < Gamis < Gamis Jumbo", () => {
    expect(SIZE_ORDER["Midi"]).toBeLessThan(SIZE_ORDER["Midi Jumbo"]);
    expect(SIZE_ORDER["Midi Jumbo"]).toBeLessThan(SIZE_ORDER["Gamis"]);
    expect(SIZE_ORDER["Gamis"]).toBeLessThan(SIZE_ORDER["Gamis Jumbo"]);
  });
});

describe("sortRows", () => {
  it("mengurutkan berdasarkan SIZE_ORDER lalu warna", () => {
    const rows = [
      { size: "Gamis", warna: "HITAM" },
      { size: "Midi", warna: "PUTIH" },
      { size: "Midi", warna: "HITAM" },
    ];
    const sorted = sortRows(rows);
    expect(sorted[0]).toMatchObject({ size: "Midi", warna: "HITAM" });
    expect(sorted[1]).toMatchObject({ size: "Midi", warna: "PUTIH" });
    expect(sorted[2]).toMatchObject({ size: "Gamis", warna: "HITAM" });
  });

  it("tidak memutasi array asli", () => {
    const rows = [{ size: "Gamis", warna: "A" }];
    const copy = [...rows];
    sortRows(rows);
    expect(rows).toEqual(copy);
  });
});

describe("kodeNum", () => {
  it("mengekstrak nomor dari kode D-{n}-{bahan}", () => {
    expect(kodeNum("D-07-OSK")).toBe(7);
    expect(kodeNum("D-82-SFN")).toBe(82);
  });

  it("mengembalikan 0 untuk format tidak valid", () => {
    expect(kodeNum("X-01")).toBe(0);
    expect(kodeNum("")).toBe(0);
    expect(kodeNum(null)).toBe(0);
  });
});

describe("rowKey", () => {
  it("menggabungkan kode__size__warna", () => {
    expect(rowKey("D-01-OSK", "Midi", "HITAM")).toBe("D-01-OSK__Midi__HITAM");
  });
});

describe("selisihCls", () => {
  it("0 → green (sesuai)", () => {
    expect(selisihCls(0)).toContain("green");
  });

  it("> 0 → amber (kelebihan)", () => {
    expect(selisihCls(5)).toContain("amber");
  });

  it("< 0 → red (kekurangan)", () => {
    expect(selisihCls(-3)).toContain("red");
  });
});

describe("selisihLabel", () => {
  it("0 → '✓'", () => {
    expect(selisihLabel(0)).toBe("✓");
  });

  it("> 0 → '+{n}'", () => {
    expect(selisihLabel(5)).toBe("+5");
  });

  it("< 0 → '{n}' (dengan minus)", () => {
    expect(selisihLabel(-3)).toBe("-3");
  });
});

describe("flattenVariantMap", () => {
  it("meratakan {kode:{size:{warna:qty}}} jadi map datar kode__size__warna", () => {
    const nested = { "D-01-OSK": { Midi: { HITAM: 3, PUTIH: 0 }, Gamis: { _: 2 } } };
    expect(flattenVariantMap(nested)).toEqual({
      "D-01-OSK__Midi__HITAM": 3,
      "D-01-OSK__Midi__PUTIH": 0,
      "D-01-OSK__Gamis___": 2,
    });
  });

  it("input null/undefined → {} tanpa crash", () => {
    expect(flattenVariantMap(null)).toEqual({});
    expect(flattenVariantMap(undefined)).toEqual({});
  });

  it("input {} → {}", () => {
    expect(flattenVariantMap({})).toEqual({});
  });
});
