import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fmtRp, fmtDate, monthLabel, daysUntil, buildMonthOptions,
  getMonthRange, calcRingkasan, calcBahanUsage,
} from "./utils";

describe("fmtRp", () => {
  it("formats integer", () => {
    expect(fmtRp(105000)).toBe("Rp 105.000");
  });
  it("formats 0", () => {
    expect(fmtRp(0)).toBe("Rp 0");
  });
  it("handles null/undefined", () => {
    expect(fmtRp(null)).toBe("Rp 0");
    expect(fmtRp(undefined)).toBe("Rp 0");
  });
});

describe("fmtDate", () => {
  it("returns - for falsy", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate("")).toBe("-");
  });
  it("returns formatted Indonesian date", () => {
    const result = fmtDate("2024-01-15");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/Jan|15/);
  });
});

describe("monthLabel", () => {
  it("returns month+year label in Indonesian", () => {
    const label = monthLabel(2024, 1);
    expect(label).toMatch(/2024/);
  });
});

describe("daysUntil", () => {
  it("returns negative for past dates", () => {
    expect(daysUntil("2000-01-01")).toBeLessThan(0);
  });
  it("returns positive for future dates", () => {
    expect(daysUntil("2099-01-01")).toBeGreaterThan(0);
  });
});

describe("buildMonthOptions", () => {
  it("returns array of {value, label} objects", () => {
    const opts = buildMonthOptions();
    expect(opts.length).toBeGreaterThan(10);
    expect(opts[0]).toHaveProperty("value");
    expect(opts[0]).toHaveProperty("label");
  });
  it("value format is YYYY-MM", () => {
    const opts = buildMonthOptions();
    expect(opts[0].value).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("getMonthRange", () => {
  it("returns correct fromDate and toDate for Jan 2024", () => {
    const r = getMonthRange("2024-01");
    expect(r.fromDate).toBe("2024-01-01");
    expect(r.toDate).toBe("2024-01-31");
    expect(r.yyyy).toBe(2024);
    expect(r.mm).toBe(1);
  });
  it("returns correct toDate for February 2024 (leap year)", () => {
    const r = getMonthRange("2024-02");
    expect(r.toDate).toBe("2024-02-29");
  });
  it("returns correct toDate for February 2023 (non-leap)", () => {
    const r = getMonthRange("2023-02");
    expect(r.toDate).toBe("2023-02-28");
  });
});

describe("calcRingkasan", () => {
  it("sums total baju, tagihan, modal, avg hpp, dan avg harga jual", () => {
    const batches = [
      { total_kain: 10, hpp_per_item: 80000, harga_jual: 260000 },
      { total_kain: 5, hpp_per_item: 100000, harga_jual: 300000 },
    ];
    const tagihan = [{ total_harga: 50000 }, { total_harga: 30000 }];
    const r = calcRingkasan(batches, tagihan);
    expect(r.totalBaju).toBe(15);
    expect(r.totalTagihan).toBe(80000);
    expect(r.totalModal).toBe(10 * 80000 + 5 * 100000);
    expect(r.hppAvg).toBe(90000);
    expect(r.hargaJualAvg).toBe(280000); // avg of 260000 + 300000
  });
  it("hppAvg is 0 when no hpp", () => {
    const r = calcRingkasan([{ total_kain: 5, hpp_per_item: 0, harga_jual: 0 }], []);
    expect(r.hppAvg).toBe(0);
  });
  it("hargaJualAvg is 0 when no harga_jual > 0", () => {
    const r = calcRingkasan([{ total_kain: 5, hpp_per_item: 80000, harga_jual: 0 }], []);
    expect(r.hargaJualAvg).toBe(0);
  });
  it("hargaJualAvg excludes batches with harga_jual = 0", () => {
    const batches = [
      { total_kain: 3, hpp_per_item: 0, harga_jual: 250000 },
      { total_kain: 3, hpp_per_item: 0, harga_jual: 0 },
    ];
    const r = calcRingkasan(batches, []);
    expect(r.hargaJualAvg).toBe(250000);
  });
  it("handles empty arrays", () => {
    const r = calcRingkasan([], []);
    expect(r.totalBaju).toBe(0);
    expect(r.totalTagihan).toBe(0);
    expect(r.totalModal).toBe(0);
    expect(r.hppAvg).toBe(0);
    expect(r.hargaJualAvg).toBe(0);
  });
});

describe("calcBahanUsage", () => {
  it("aggregates same bahan+satuan across batches", () => {
    const batches = [
      { bahan_dipakai: [{ nama_bahan: "Wolfis", satuan: "yard", jumlah: 5 }] },
      { bahan_dipakai: [{ nama_bahan: "Wolfis", satuan: "yard", jumlah: 3 }] },
    ];
    const rows = calcBahanUsage(batches);
    expect(rows).toHaveLength(1);
    expect(rows[0].jumlah).toBe(8);
  });
  it("keeps separate rows for different satuan", () => {
    const batches = [
      {
        bahan_dipakai: [
          { nama_bahan: "Wolfis", satuan: "yard", jumlah: 5 },
          { nama_bahan: "Wolfis", satuan: "meter", jumlah: 3 },
        ],
      },
    ];
    const rows = calcBahanUsage(batches);
    expect(rows).toHaveLength(2);
    const satuan = rows.map((r) => r.satuan);
    expect(satuan).toContain("yard");
    expect(satuan).toContain("meter");
  });
});
