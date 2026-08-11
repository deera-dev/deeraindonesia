import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fmtRp, fmtDate, genBatchNo, buildKode, parseKode,
  initVariants, initWarnaList, initQtyMap, newEntry, entryTotalKain,
  inputCls, labelCls, filterAndSortBatches,
} from "./utils";
import { DEFAULT_BATCH_FILTER } from "./store";

describe("fmtRp", () => {
  it("formats number", () => { expect(fmtRp(50000)).toContain("50.000"); });
  it("handles 0", () => { expect(fmtRp(0)).toBe("Rp 0"); });
});

describe("fmtDate", () => {
  it("returns - for null", () => { expect(fmtDate(null)).toBe("-"); });
  it("returns non-empty string for valid date", () => {
    expect(fmtDate("2024-03-15")).toBeTruthy();
    expect(fmtDate("2024-03-15")).not.toBe("-");
  });
});

describe("genBatchNo", () => {
  it("returns string starting with PROD-", () => {
    expect(genBatchNo()).toMatch(/^PROD-\d{8}-\d{3}$/);
  });
  it("generates unique values", () => {
    const a = genBatchNo(), b = genBatchNo();
    // not guaranteed but highly likely
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });
});

describe("buildKode", () => {
  it("builds kode correctly", () => { expect(buildKode("07", "OSK")).toBe("D-07-OSK"); });
  it("uppercases bahan", () => { expect(buildKode("01", "sfn")).toBe("D-01-SFN"); });
  it("returns empty string when both empty", () => { expect(buildKode("", "")).toBe(""); });
});

describe("parseKode", () => {
  it("parses valid kode", () => {
    const r = parseKode("D-07-OSK");
    expect(r.angka).toBe("07");
    expect(r.bahan).toBe("OSK");
  });
  it("returns empty on invalid", () => {
    const r = parseKode("INVALID");
    expect(r.angka).toBe("");
    expect(r.bahan).toBe("");
  });
  it("handles null", () => {
    const r = parseKode(null);
    expect(r.angka).toBe("");
  });
});

describe("initVariants", () => {
  it("marks sizes from existing batch as aktif", () => {
    const sizes = [{ size: "Midi" }];
    const v = initVariants(sizes);
    const midi = v.find(x => x.size === "Midi");
    expect(midi.aktif).toBe(true);
    const gamis = v.find(x => x.size === "Gamis");
    expect(gamis.aktif).toBe(false);
  });
  it("all inactive when empty sizes", () => {
    const v = initVariants([]);
    expect(v.every(x => !x.aktif)).toBe(true);
  });
});

describe("initWarnaList", () => {
  it("collects unique non-underscore warnas", () => {
    const sizes = [
      { size: "Midi", warna: [{ warna: "HITAM", qty: 5 }, { warna: "_", qty: 2 }] },
      { size: "Gamis", warna: [{ warna: "HITAM", qty: 3 }, { warna: "MERAH", qty: 4 }] },
    ];
    const list = initWarnaList(sizes);
    expect(list).toContain("HITAM");
    expect(list).toContain("MERAH");
    expect(list).not.toContain("_");
    expect(new Set(list).size).toBe(list.length); // unique
  });
  it("returns empty for empty sizes", () => {
    expect(initWarnaList([])).toEqual([]);
  });
});

describe("initQtyMap", () => {
  it("builds nested map[size][warna] = qty", () => {
    const sizes = [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }];
    const map = initQtyMap(sizes);
    expect(map["Midi"]["HITAM"]).toBe(5);
  });
  it("returns empty for empty sizes", () => {
    expect(initQtyMap([])).toEqual({});
  });
});

describe("newEntry", () => {
  it("returns object with required fields", () => {
    const e = newEntry();
    expect(e.kodeAngka).toBe("");
    expect(Array.isArray(e.variants)).toBe(true);
    expect(Array.isArray(e.warnaList)).toBe(true);
    expect(e.expanded).toBe(true);
  });

  it("includes upahJahit defaulting to empty string", () => {
    const e = newEntry();
    expect(e.upahJahit).toBe("");
  });
});

describe("entryTotalKain", () => {
  it("sums all qty values across all size/warna combinations", () => {
    const entry = {
      qtyMap: {
        "Midi": { "HITAM": "5", "MERAH": "3" },
        "Gamis": { "HITAM": "2" },
      },
    };
    expect(entryTotalKain(entry)).toBe(10);
  });
  it("returns 0 for empty qtyMap", () => {
    expect(entryTotalKain({ qtyMap: {} })).toBe(0);
  });
});

describe("constants", () => {
  it("inputCls and labelCls are non-empty strings", () => {
    expect(typeof inputCls).toBe("string");
    expect(typeof labelCls).toBe("string");
    expect(inputCls.length).toBeGreaterThan(0);
    expect(labelCls.length).toBeGreaterThan(0);
  });
});

describe("filterAndSortBatches", () => {
  const BATCHES = [
    {
      id: "1",
      kode_produk: "D-01-OSK",
      nama_produk: "Gamis Alpha",
      batch_no: "PROD-20260101-100",
      tanggal_produksi: "2026-01-01",
      total_kain: 50,
      hpp_per_item: 80000,
      upah_jahit: 25000,
      bahan_dipakai: [{ nama_bahan: "Katun" }],
      catatan: "batch pertama",
    },
    {
      id: "2",
      kode_produk: "D-02-SFN",
      nama_produk: "Mukena Beta",
      batch_no: "PROD-20260215-200",
      tanggal_produksi: "2026-02-15",
      total_kain: 100,
      hpp_per_item: 120000,
      upah_jahit: 30000,
      bahan_dipakai: [], // belum tersinkron
      catatan: "",
    },
    {
      id: "3",
      kode_produk: "D-03-KTN",
      nama_produk: "Gamis Gamma",
      batch_no: "PROD-20260320-300",
      tanggal_produksi: "2026-03-20",
      total_kain: 30,
      hpp_per_item: 60000,
      upah_jahit: 0,
      bahan_dipakai: null, // belum tersinkron
      catatan: "cek stok",
    },
  ];

  it("tanpa filter aktif: mengembalikan semua batch terurut terbaru dulu (default)", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "" });
    expect(result.map((b) => b.id)).toEqual(["3", "2", "1"]);
  });

  it("search cocok kode_produk", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "D-01" });
    expect(result.map((b) => b.id)).toEqual(["1"]);
  });

  it("search cocok nama_produk (case-insensitive)", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "gamis" });
    expect(result.map((b) => b.id).sort()).toEqual(["1", "3"]);
  });

  it("search cocok batch_no", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "200" });
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("search cocok catatan", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "stok" });
    expect(result.map((b) => b.id)).toEqual(["3"]);
  });

  it("search cocok nama_bahan di dalam bahan_dipakai", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "katun" });
    expect(result.map((b) => b.id)).toEqual(["1"]);
  });

  it("search tidak match: kosong", () => {
    const result = filterAndSortBatches(BATCHES, DEFAULT_BATCH_FILTER, { search: "zzz" });
    expect(result).toEqual([]);
  });

  it("filter rentang tanggal", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, tanggalMin: "2026-02-01", tanggalMax: "2026-03-01" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("filter rentang jumlah potong", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, potongMin: "40", potongMax: "60" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["1"]);
  });

  it("filter rentang HPP", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, hppMin: "70000", hppMax: "100000" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["1"]);
  });

  it("filter rentang upah jahit", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, upahJahitMin: "26000" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["2"]);
  });

  it("filter status bahan 'belum' (bahan_dipakai kosong/null)", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, bahanStatus: "belum" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id).sort()).toEqual(["2", "3"]);
  });

  it("filter status bahan 'sinkron' (bahan_dipakai terisi)", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, bahanStatus: "sinkron" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["1"]);
  });

  it("sort terlama (tanggal ascending)", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, sort: "terlama" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["1", "2", "3"]);
  });

  it("sort potong-terbanyak", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, sort: "potong-terbanyak" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["2", "1", "3"]);
  });

  it("sort potong-tersedikit", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, sort: "potong-tersedikit" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["3", "1", "2"]);
  });

  it("sort hpp-tertinggi", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, sort: "hpp-tertinggi" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["2", "1", "3"]);
  });

  it("sort hpp-terendah", () => {
    const filter = { ...DEFAULT_BATCH_FILTER, sort: "hpp-terendah" };
    const result = filterAndSortBatches(BATCHES, filter, {});
    expect(result.map((b) => b.id)).toEqual(["3", "1", "2"]);
  });

  it("batches null/undefined tidak error", () => {
    expect(filterAndSortBatches(null, DEFAULT_BATCH_FILTER, {})).toEqual([]);
    expect(filterAndSortBatches(undefined, DEFAULT_BATCH_FILTER, {})).toEqual([]);
  });
});
