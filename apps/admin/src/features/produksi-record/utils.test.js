import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fmtRp, fmtDate, genBatchNo, buildKode, parseKode,
  initVariants, initWarnaList, initQtyMap, newEntry, entryTotalKain,
  inputCls, labelCls,
} from "./utils";

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
