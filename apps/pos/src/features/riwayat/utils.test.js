import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMeta,
  presetToDates,
  formatTime,
  formatGroupDate,
  groupByDate,
  formatRp,
  ACTION_META,
  CATEGORY_FILTERS,
  DATE_PRESETS,
} from "./utils";

describe("getMeta", () => {
  it("returns correct meta for known action 'sale'", () => {
    const meta = getMeta("sale");
    expect(meta.label).toBe("Penjualan");
    expect(meta.badgeCls).toContain("green");
  });

  it("returns correct meta for 'retur'", () => {
    expect(getMeta("retur").label).toBe("Retur");
  });

  it("returns fallback for unknown action", () => {
    const meta = getMeta("unknown-action");
    expect(meta.label).toBe("unknown-action");
    expect(meta.badgeCls).toContain("CAB170");
  });

  it("returns meta for 'transfer-buat'", () => {
    expect(getMeta("transfer-buat").label).toBe("Transfer Baru");
  });

  it("returns meta for 'batch-produksi'", () => {
    expect(getMeta("batch-produksi").label).toBe("Batch Produksi");
  });

  it("has entries for all expected actions", () => {
    const expectedActions = ["sale", "retur", "tambah", "edit", "hapus", "stok-opname",
      "transfer-buat", "transfer-approve", "transfer-reject",
      "pelanggan-tambah", "pelanggan-edit", "pelanggan-hapus",
      "batch-produksi", "hpp-simpan", "hpp-hapus", "bahan-beli", "bahan-pinjam", "bahan-hapus"];
    for (const a of expectedActions) {
      expect(ACTION_META[a]).toBeDefined();
    }
  });
});

describe("presetToDates", () => {
  it("returns today range for preset='today'", () => {
    const { dateFrom, dateTo } = presetToDates("today");
    const today = new Date().toISOString().split("T")[0];
    expect(dateFrom).toBe(today);
    expect(dateTo).toBe(today);
  });

  it("returns 7-day range for preset='week'", () => {
    const { dateFrom, dateTo } = presetToDates("week");
    const today = new Date().toISOString().split("T")[0];
    expect(dateTo).toBe(today);
    const diff = (new Date(dateTo) - new Date(dateFrom)) / 86400000;
    expect(diff).toBe(6);
  });

  it("returns 30-day range for preset='month'", () => {
    const { dateFrom, dateTo } = presetToDates("month");
    const diff = (new Date(dateTo) - new Date(dateFrom)) / 86400000;
    expect(diff).toBe(29);
  });

  it("returns null dates for preset='all'", () => {
    const { dateFrom, dateTo } = presetToDates("all");
    expect(dateFrom).toBeNull();
    expect(dateTo).toBeNull();
  });
});

describe("formatTime", () => {
  it("returns empty string for null", () => {
    expect(formatTime(null)).toBe("");
  });

  it("returns HH:MM format string", () => {
    const result = formatTime("2026-07-04T08:30:00.000Z");
    expect(typeof result).toBe("string");
    // id-ID locale may use "." or ":" as time separator depending on runtime
    expect(result).toMatch(/\d{2}[:.]\d{2}/);
  });
});

describe("formatGroupDate", () => {
  it("returns empty string for null", () => {
    expect(formatGroupDate(null)).toBe("");
  });

  it("returns 'Hari Ini' for today", () => {
    const today = new Date().toISOString();
    expect(formatGroupDate(today)).toBe("Hari Ini");
  });

  it("returns 'Kemarin' for yesterday", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(formatGroupDate(d.toISOString())).toBe("Kemarin");
  });

  it("returns date string for older dates", () => {
    const old = new Date("2026-01-01T00:00:00.000Z").toISOString();
    const result = formatGroupDate(old);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(4);
  });
});

describe("groupByDate", () => {
  it("returns empty array for empty input", () => {
    expect(groupByDate([])).toEqual([]);
  });

  it("groups items by date", () => {
    const items = [
      { changed_at: "2026-07-04T10:00:00.000Z" },
      { changed_at: "2026-07-04T11:00:00.000Z" },
      { changed_at: "2026-07-03T09:00:00.000Z" },
    ];
    const groups = groupByDate(items);
    expect(groups.length).toBe(2);
    expect(groups[0].items.length).toBe(2);
    expect(groups[1].items.length).toBe(1);
  });

  it("each group has key and label", () => {
    const items = [{ changed_at: "2026-07-04T10:00:00.000Z" }];
    const groups = groupByDate(items);
    expect(groups[0].key).toBeDefined();
    expect(groups[0].label).toBeDefined();
  });
});

describe("formatRp", () => {
  it("formats 100000 as 'Rp 100.000'", () => {
    const result = formatRp(100000);
    expect(result).toContain("Rp");
    expect(result).toContain("100");
  });

  it("returns '–' for null", () => {
    expect(formatRp(null)).toBe("–");
  });

  it("returns '–' for undefined", () => {
    expect(formatRp(undefined)).toBe("–");
  });

  it("formats 0 without returning '–'", () => {
    const result = formatRp(0);
    expect(result).toContain("Rp");
  });
});

describe("CATEGORY_FILTERS", () => {
  it("has semua as first filter", () => {
    expect(CATEGORY_FILTERS[0].value).toBe("semua");
  });

  it("has 6 filters", () => {
    expect(CATEGORY_FILTERS.length).toBe(6);
  });
});

describe("DATE_PRESETS", () => {
  it("has 4 presets", () => {
    expect(DATE_PRESETS.length).toBe(4);
  });

  it("starts with today", () => {
    expect(DATE_PRESETS[0].value).toBe("today");
  });
});
