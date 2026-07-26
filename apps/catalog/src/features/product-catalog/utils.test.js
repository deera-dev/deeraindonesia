import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isBaru,
  filterProducts,
  sortCatalogProducts,
  getFilterOptions,
  filterByAttributes,
  pickBestPeriode,
  TERLARIS_LABELS,
} from "./utils";

describe("isBaru", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("false saat createdAt null/undefined", () => {
    expect(isBaru(null)).toBe(false);
    expect(isBaru(undefined)).toBe(false);
  });

  it("false saat createdAt string tidak valid", () => {
    expect(isBaru("bukan-tanggal")).toBe(false);
  });

  it("true saat createdAt dalam 14 hari terakhir (default)", () => {
    expect(isBaru("2026-07-20T00:00:00.000Z")).toBe(true);
  });

  it("false saat createdAt lebih dari 14 hari lalu", () => {
    expect(isBaru("2026-07-01T00:00:00.000Z")).toBe(false);
  });

  it("false saat createdAt di masa depan", () => {
    expect(isBaru("2026-08-01T00:00:00.000Z")).toBe(false);
  });

  it("menghormati parameter days custom", () => {
    expect(isBaru("2026-07-22T00:00:00.000Z", 2)).toBe(false);
    expect(isBaru("2026-07-24T00:00:00.000Z", 2)).toBe(true);
  });
});

describe("filterProducts", () => {
  const products = [
    { kode: "D-07-OSK", nama: "Gamis Dewi" },
    { kode: "D-08-SFN", nama: "Mukena Aisyah" },
    { kode: "D-09-OSK", nama: "Gamis Aisyah" },
  ];

  it("mengembalikan array kosong saat query kosong/whitespace", () => {
    expect(filterProducts(products, "")).toEqual([]);
    expect(filterProducts(products, "   ")).toEqual([]);
    expect(filterProducts(products, undefined)).toEqual([]);
  });

  it("match by kode (case-insensitive, substring)", () => {
    const result = filterProducts(products, "d-07");
    expect(result).toEqual([products[0]]);
  });

  it("match by nama (case-insensitive, substring)", () => {
    const result = filterProducts(products, "aisyah");
    expect(result.map((p) => p.kode)).toEqual(["D-08-SFN", "D-09-OSK"]);
  });

  it("mengembalikan array kosong saat tidak ada match", () => {
    expect(filterProducts(products, "zzz")).toEqual([]);
  });

  it("fallback ke array kosong saat products null/undefined", () => {
    expect(filterProducts(null, "gamis")).toEqual([]);
    expect(filterProducts(undefined, "gamis")).toEqual([]);
  });
});


describe("sortCatalogProducts", () => {
  it("hanya mengembalikan produk yang punya image", () => {
    const result = sortCatalogProducts([
      { kode: "A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "B", image: null, created_at: "2026-02-01" },
    ]);
    expect(result.map((p) => p.kode)).toEqual(["A"]);
  });

  it("urut created_at desc, created_at null/undefined dianggap kosong (di akhir)", () => {
    const result = sortCatalogProducts([
      { kode: "A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "B", image: "b.jpg", created_at: undefined },
      { kode: "C", image: "c.jpg", created_at: "2026-03-01" },
    ]);
    expect(result.map((p) => p.kode)).toEqual(["C", "A", "B"]);
  });

  it("fallback ke array kosong saat products null/undefined", () => {
    expect(sortCatalogProducts(null)).toEqual([]);
    expect(sortCatalogProducts(undefined)).toEqual([]);
  });
});


describe("getFilterOptions", () => {
  const products = [
    { kode: "A", bahan: "Ceruti", variants: [{ size: "Midi" }, { size: "Gamis Jumbo" }] },
    { kode: "B", bahan: "Sifon", variants: [{ size: "Midi" }] },
    { kode: "C", bahan: "Ceruti", variants: [] },
    { kode: "D" },
  ];

  it("mengembalikan bahan unik terurut alfabet", () => {
    const { bahanList } = getFilterOptions(products);
    expect(bahanList).toEqual(["Ceruti", "Sifon"]);
  });

  it("mengembalikan ukuran unik terurut alfabet dari variants[].size", () => {
    const { ukuranList } = getFilterOptions(products);
    expect(ukuranList).toEqual(["Gamis Jumbo", "Midi"]);
  });

  it("fallback ke list kosong saat products null/undefined", () => {
    expect(getFilterOptions(null)).toEqual({ bahanList: [], ukuranList: [] });
    expect(getFilterOptions(undefined)).toEqual({ bahanList: [], ukuranList: [] });
  });
});

describe("filterByAttributes", () => {
  const products = [
    { kode: "A", bahan: "Ceruti", variants: [{ size: "Midi" }] },
    { kode: "B", bahan: "Sifon", variants: [{ size: "Gamis Jumbo" }] },
    { kode: "C", bahan: "Ceruti", variants: [{ size: "Gamis Jumbo" }] },
  ];

  it("tanpa filter aktif mengembalikan semua produk apa adanya", () => {
    expect(filterByAttributes(products, {})).toEqual(products);
    expect(filterByAttributes(products)).toEqual(products);
  });

  it("filter by bahan saja", () => {
    const result = filterByAttributes(products, { bahan: "Ceruti" });
    expect(result.map((p) => p.kode)).toEqual(["A", "C"]);
  });

  it("filter by ukuran saja", () => {
    const result = filterByAttributes(products, { ukuran: "Gamis Jumbo" });
    expect(result.map((p) => p.kode)).toEqual(["B", "C"]);
  });

  it("filter by bahan DAN ukuran sekaligus (AND)", () => {
    const result = filterByAttributes(products, { bahan: "Ceruti", ukuran: "Gamis Jumbo" });
    expect(result.map((p) => p.kode)).toEqual(["C"]);
  });

  it("fallback ke array kosong saat products null/undefined", () => {
    expect(filterByAttributes(null, { bahan: "Ceruti" })).toEqual([]);
  });
});


describe("pickBestPeriode", () => {
  it("mengembalikan periode lain kalau salah satu null/undefined", () => {
    expect(pickBestPeriode(null, "30d")).toBe("30d");
    expect(pickBestPeriode("7d", undefined)).toBe("7d");
    expect(pickBestPeriode(null, null)).toBe(null);
  });

  it("memilih periode yang lebih relevan: 7d > 30d > 90d > all", () => {
    expect(pickBestPeriode("30d", "7d")).toBe("7d");
    expect(pickBestPeriode("7d", "30d")).toBe("7d");
    expect(pickBestPeriode("90d", "30d")).toBe("30d");
    expect(pickBestPeriode("all", "90d")).toBe("90d");
    expect(pickBestPeriode("all", "7d")).toBe("7d");
  });

  it("periode sama mengembalikan periode itu sendiri", () => {
    expect(pickBestPeriode("30d", "30d")).toBe("30d");
  });
});

describe("TERLARIS_LABELS", () => {
  it("punya label untuk semua periode yang dikembalikan RPC get_terlaris_kodes", () => {
    expect(TERLARIS_LABELS["7d"]).toBe("Terlaris Minggu Ini");
    expect(TERLARIS_LABELS["30d"]).toBe("Terlaris Bulan Ini");
    expect(TERLARIS_LABELS["90d"]).toBe("Terlaris 3 Bulan");
    expect(TERLARIS_LABELS.all).toBe("Best Seller");
  });
});
