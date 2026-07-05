import { describe, it, expect } from "vitest";
import { LOCS, SIZE_ORDER, sortRows, kodeNum, SIZE_COLORS, MKT_CARDS } from "./utils";

describe("LOCS", () => {
  it("memiliki 3 entri: gudang, cideng, tegalgubug", () => {
    expect(LOCS).toHaveLength(3);
    expect(LOCS.map((l) => l.key)).toEqual(["gudang", "cideng", "tegalgubug"]);
  });
});

describe("SIZE_ORDER", () => {
  it("memiliki urutan yang benar untuk 4 size", () => {
    expect(SIZE_ORDER["Midi"]).toBeLessThan(SIZE_ORDER["Midi Jumbo"]);
    expect(SIZE_ORDER["Midi Jumbo"]).toBeLessThan(SIZE_ORDER["Gamis"]);
    expect(SIZE_ORDER["Gamis"]).toBeLessThan(SIZE_ORDER["Gamis Jumbo"]);
  });
});

describe("sortRows", () => {
  it("mengurutkan berdasarkan SIZE_ORDER lalu warna (alphabetical)", () => {
    const rows = [
      { size: "Gamis", warna: "MERAH" },
      { size: "Midi", warna: "HITAM" },
      { size: "Gamis", warna: "HITAM" },
      { size: "Midi", warna: "PUTIH" },
    ];
    const sorted = sortRows(rows);
    expect(sorted[0]).toMatchObject({ size: "Midi", warna: "HITAM" });
    expect(sorted[1]).toMatchObject({ size: "Midi", warna: "PUTIH" });
    expect(sorted[2]).toMatchObject({ size: "Gamis", warna: "HITAM" });
    expect(sorted[3]).toMatchObject({ size: "Gamis", warna: "MERAH" });
  });

  it("tidak memutasi array asli", () => {
    const rows = [{ size: "Gamis", warna: "A" }, { size: "Midi", warna: "B" }];
    const original = [...rows];
    sortRows(rows);
    expect(rows).toEqual(original);
  });

  it("size tidak dikenal mendapat order 99 (ditaruh paling akhir)", () => {
    const rows = [{ size: "Unknown", warna: "A" }, { size: "Midi", warna: "B" }];
    const sorted = sortRows(rows);
    expect(sorted[0].size).toBe("Midi");
    expect(sorted[1].size).toBe("Unknown");
  });
});

describe("kodeNum", () => {
  it("mengekstrak angka dari kode format D-{n}-{bahan}", () => {
    expect(kodeNum("D-07-OSK")).toBe(7);
    expect(kodeNum("D-123-SFN")).toBe(123);
  });

  it("mengembalikan 0 untuk format tidak valid atau null", () => {
    expect(kodeNum("X-01-OSK")).toBe(0);
    expect(kodeNum("")).toBe(0);
    expect(kodeNum(null)).toBe(0);
    expect(kodeNum(undefined)).toBe(0);
  });
});

describe("SIZE_COLORS", () => {
  it("memiliki warna untuk semua 4 size", () => {
    expect(SIZE_COLORS["Midi"]).toBeTypeOf("string");
    expect(SIZE_COLORS["Midi Jumbo"]).toBeTypeOf("string");
    expect(SIZE_COLORS["Gamis"]).toBeTypeOf("string");
    expect(SIZE_COLORS["Gamis Jumbo"]).toBeTypeOf("string");
  });
});

describe("MKT_CARDS", () => {
  it("memiliki 3 kartu untuk 3 lokasi", () => {
    expect(MKT_CARDS).toHaveLength(3);
    expect(MKT_CARDS.map((c) => c.key)).toEqual(["gudang", "cideng", "tegalgubug"]);
  });

  it("setiap kartu memiliki lbl, name, color, bg", () => {
    for (const card of MKT_CARDS) {
      expect(card.lbl).toBeTypeOf("string");
      expect(card.name).toBeTypeOf("string");
      expect(card.color).toBeTypeOf("string");
      expect(card.bg).toBeTypeOf("string");
    }
  });
});
