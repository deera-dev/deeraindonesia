import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ACTION_META,
  getMeta,
  presetToDates,
  formatTime,
  formatGroupDate,
  groupByDate,
} from "./utils";

describe("ACTION_META", () => {
  it("mengandung entry untuk semua aksi standar", () => {
    const requiredKeys = [
      "tambah", "edit", "hapus",
      "transfer-buat", "transfer-approve", "transfer-reject",
      "stok-opname", "batch-produksi", "hpp-simpan", "hpp-hapus",
      "bahan-beli", "bahan-pinjam", "bahan-hapus",
      "sampel-buat", "sampel-approve", "sampel-reject",
      "pelanggan-tambah", "pelanggan-edit", "pelanggan-hapus",
    ];
    for (const key of requiredKeys) {
      expect(ACTION_META[key]).toBeDefined();
      expect(ACTION_META[key].label).toBeTypeOf("string");
      expect(ACTION_META[key].badgeCls).toBeTypeOf("string");
    }
  });
});

describe("getMeta", () => {
  it("mengembalikan meta untuk aksi yang dikenal", () => {
    const m = getMeta("tambah");
    expect(m.label).toBe("Tambah Produk");
    expect(m.color).toBe("#22c55e");
  });

  it("mengembalikan fallback untuk aksi tidak dikenal", () => {
    const m = getMeta("unknown-action");
    expect(m.label).toBe("unknown-action");
    expect(m.color).toBe("#CAB170");
    expect(m.badgeCls).toBeTypeOf("string");
  });

  it("undefined action → label undefined, fallback color", () => {
    const m = getMeta(undefined);
    expect(m.color).toBe("#CAB170");
  });
});

describe("presetToDates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T10:00:00"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("today → dateFrom & dateTo = today", () => {
    expect(presetToDates("today")).toEqual({ dateFrom: "2026-06-30", dateTo: "2026-06-30" });
  });

  it("week → dateFrom = 6 hari lalu, dateTo = today", () => {
    const r = presetToDates("week");
    expect(r.dateTo).toBe("2026-06-30");
    expect(r.dateFrom).toBe("2026-06-24");
  });

  it("month → dateFrom = 29 hari lalu, dateTo = today", () => {
    const r = presetToDates("month");
    expect(r.dateTo).toBe("2026-06-30");
    expect(r.dateFrom).toBe("2026-06-01");
  });

  it("unknown/null → dateFrom & dateTo null", () => {
    expect(presetToDates("all")).toEqual({ dateFrom: null, dateTo: null });
    expect(presetToDates(null)).toEqual({ dateFrom: null, dateTo: null });
  });
});

describe("formatTime", () => {
  it("mengembalikan string kosong saat input null/falsy", () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime("")).toBe("");
    expect(formatTime(undefined)).toBe("");
  });

  it("memformat ISO string ke HH:MM format id-ID", () => {
    const result = formatTime("2026-06-30T08:30:00Z");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatGroupDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("mengembalikan 'Hari Ini' untuk tanggal hari ini", () => {
    expect(formatGroupDate("2026-06-30T09:00:00")).toBe("Hari Ini");
  });

  it("mengembalikan 'Kemarin' untuk tanggal kemarin", () => {
    expect(formatGroupDate("2026-06-29T09:00:00")).toBe("Kemarin");
  });

  it("mengembalikan format panjang untuk tanggal lebih lama", () => {
    const r = formatGroupDate("2026-06-01T09:00:00");
    expect(r).not.toBe("Hari Ini");
    expect(r).not.toBe("Kemarin");
    expect(r).toBeTypeOf("string");
    expect(r.length).toBeGreaterThan(5);
  });

  it("mengembalikan string kosong untuk null", () => {
    expect(formatGroupDate(null)).toBe("");
    expect(formatGroupDate("")).toBe("");
  });
});

describe("groupByDate", () => {
  it("mengembalikan array kosong dari input kosong", () => {
    expect(groupByDate([])).toEqual([]);
  });

  it("mengelompokkan item per hari (key = toLocaleDateString id-ID)", () => {
    const items = [
      { changed_at: "2026-06-30T08:00:00" },
      { changed_at: "2026-06-30T12:00:00" },
      { changed_at: "2026-06-29T10:00:00" },
    ];
    const groups = groupByDate(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it("setiap group memiliki key, label, dan items", () => {
    const items = [{ changed_at: "2026-06-30T08:00:00" }];
    const [g] = groupByDate(items);
    expect(g.key).toBeTypeOf("string");
    expect(g.label).toBeTypeOf("string");
    expect(g.items).toHaveLength(1);
  });
});
