import { describe, it, expect } from "vitest";
import {
  LOCS,
  SIZE_ORDER,
  sortRows,
  kodeNum,
  sortProductsTerbaru,
  SIZE_COLORS,
  MKT_CARDS,
  dikerjakanKey,
  syntheticStokId,
  isSyntheticStokId,
  parseSyntheticStokId,
  fillMissingStokRows,
} from "./utils";

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

// ── syntheticStokId / isSyntheticStokId / parseSyntheticStokId + ──────────
// fillMissingStokRows (fix bug 2026-09, laporan Denny: "tidak bisa
// menambahkan stok di produk tertentu, tulisannya belum ada data stok
// untuk produk ini, padahal data warnanya sudah ada juga")

describe("syntheticStokId / isSyntheticStokId / parseSyntheticStokId", () => {
  it("membuat id sintetik yang bisa dideteksi & di-decode balik", () => {
    const id = syntheticStokId("D-33-POL", "Midi", "_");
    expect(isSyntheticStokId(id)).toBe(true);
    expect(parseSyntheticStokId(id)).toEqual({ kode: "D-33-POL", size: "Midi", warna: "_" });
  });

  it("id nyata (uuid) TIDAK dianggap sintetik", () => {
    const realId = "550e8400-e29b-41d4-a716-446655440000";
    expect(isSyntheticStokId(realId)).toBe(false);
    expect(parseSyntheticStokId(realId)).toBeNull();
  });

  it("isSyntheticStokId aman untuk id null/undefined/non-string", () => {
    expect(isSyntheticStokId(null)).toBe(false);
    expect(isSyntheticStokId(undefined)).toBe(false);
    expect(isSyntheticStokId(123)).toBe(false);
  });
});

describe("fillMissingStokRows", () => {
  const product = {
    kode: "D-33-POL",
    warna: ["HITAM", "MERAH"],
    variants: [{ size: "Midi" }, { size: "Gamis" }],
  };

  it("baris kosong sama sekali -> sintesis semua kombinasi ukuran x warna (stok 0)", () => {
    const result = fillMissingStokRows(product, []);
    expect(result).toHaveLength(4); // 2 ukuran x 2 warna
    expect(result.every((r) => r.gudang === 0 && r.cideng === 0 && r.tegalgubug === 0)).toBe(true);
    expect(result.every((r) => isSyntheticStokId(r.id))).toBe(true);
    const keys = result.map((r) => `${r.size}__${r.warna}`).sort();
    expect(keys).toEqual(["Gamis__HITAM", "Gamis__MERAH", "Midi__HITAM", "Midi__MERAH"]);
  });

  it("hanya mengisi kombinasi yang BELUM ada, baris nyata tidak diduplikasi", () => {
    const existing = [{ id: "real-1", kode: "D-33-POL", size: "Midi", warna: "HITAM", gudang: 5, cideng: 0, tegalgubug: 0 }];
    const result = fillMissingStokRows(product, existing);
    // 1 baris nyata + 3 placeholder (Midi/MERAH, Gamis/HITAM, Gamis/MERAH)
    expect(result).toHaveLength(4);
    expect(result.find((r) => r.id === "real-1")).toMatchObject({ gudang: 5 });
    const placeholderKeys = result.filter((r) => isSyntheticStokId(r.id)).map((r) => `${r.size}__${r.warna}`).sort();
    expect(placeholderKeys).toEqual(["Gamis__HITAM", "Gamis__MERAH", "Midi__MERAH"]);
  });

  it("semua kombinasi sudah ada -> tidak menambah placeholder apa pun", () => {
    const existing = [
      { id: "r1", kode: "D-33-POL", size: "Midi", warna: "HITAM" },
      { id: "r2", kode: "D-33-POL", size: "Midi", warna: "MERAH" },
      { id: "r3", kode: "D-33-POL", size: "Gamis", warna: "HITAM" },
      { id: "r4", kode: "D-33-POL", size: "Gamis", warna: "MERAH" },
    ];
    const result = fillMissingStokRows(product, existing);
    expect(result).toHaveLength(4);
    expect(result).toEqual(existing);
  });

  it("produk tanpa variants (belum ada ukuran aktif) -> kembalikan existingRows apa adanya", () => {
    const noVariantProduct = { kode: "D-99-XXX", warna: ["HITAM"], variants: [] };
    const result = fillMissingStokRows(noVariantProduct, []);
    expect(result).toEqual([]);
  });

  it("produk tanpa warna (array kosong) -> fallback ke warna '_' (konvensi produk tanpa warna)", () => {
    const noWarnaProduct = { kode: "D-50-XXX", warna: [], variants: [{ size: "Midi" }] };
    const result = fillMissingStokRows(noWarnaProduct, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ size: "Midi", warna: "_" });
  });

  it("tidak memutasi existingRows", () => {
    const existing = [{ id: "r1", kode: "D-33-POL", size: "Midi", warna: "HITAM" }];
    const original = [...existing];
    fillMissingStokRows(product, existing);
    expect(existing).toEqual(original);
  });
});
