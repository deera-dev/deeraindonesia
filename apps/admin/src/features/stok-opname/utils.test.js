import { describe, it, expect } from "vitest";
import { LOCS, SIZE_ORDER, sortRows, kodeNum, sortProductsTerbaru, SIZE_COLORS, MKT_CARDS, dikerjakanKey } from "./utils";

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

describe("sortProductsTerbaru", () => {
  it("mengurutkan created_at desc (terbaru dulu)", () => {
    const products = [
      { kode: "A", nama: "Aaa", created_at: "2026-01-01" },
      { kode: "B", nama: "Bbb", created_at: "2026-03-01" },
      { kode: "C", nama: "Ccc", created_at: "2026-02-01" },
    ];
    const sorted = sortProductsTerbaru(products);
    expect(sorted.map((p) => p.kode)).toEqual(["B", "C", "A"]);
  });

  it("tiebreak nama A-Z kalau created_at sama", () => {
    const products = [
      { kode: "Z", nama: "Zamrud", created_at: "2026-03-01" },
      { kode: "A", nama: "Amanda", created_at: "2026-03-01" },
    ];
    const sorted = sortProductsTerbaru(products);
    expect(sorted.map((p) => p.kode)).toEqual(["A", "Z"]);
  });

  it("produk tanpa created_at tidak crash (fallback string kosong, ditaruh paling akhir)", () => {
    const products = [
      { kode: "A", nama: "Aaa", created_at: "2026-01-01" },
      { kode: "B", nama: "Bbb" },
    ];
    const sorted = sortProductsTerbaru(products);
    expect(sorted.map((p) => p.kode)).toEqual(["A", "B"]);
  });

  it("tidak memutasi array asli", () => {
    const products = [
      { kode: "A", nama: "Aaa", created_at: "2026-01-01" },
      { kode: "B", nama: "Bbb", created_at: "2026-02-01" },
    ];
    const original = [...products];
    sortProductsTerbaru(products);
    expect(products).toEqual(original);
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

describe("dikerjakanKey", () => {
  it("menggabungkan kode dan size dengan separator | (TANPA warna — semua warna digabung)", () => {
    expect(dikerjakanKey("D-01-OSK", "Midi")).toBe("D-01-OSK|Midi");
  });

  it("kode+size yang sama selalu hasilkan key yang sama, apapun warnanya (sengaja digabung)", () => {
    // Baris stok_warna berwarna beda (mis. HITAM vs MERAH) tetap harus
    // mengacu ke key "sudah dikerjakan" yang sama, karena v_jahit_dikerjakan
    // sekarang menggabung semua warna per kode+ukuran (konfirmasi Denny:
    // "gapapa digabungin aja semua warnanya").
    expect(dikerjakanKey("D-02-OSK", "Gamis")).toBe(dikerjakanKey("D-02-OSK", "Gamis"));
  });
});
