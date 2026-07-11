import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fmtRp, fmtDate, monthLabel, daysUntil, buildMonthOptions,
  getMonthRange, calcTotalTagihan,
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

// calcRingkasan/calcBahanUsage DIHAPUS — SUM/COUNT/AVG ringkasan dan
// GROUP BY pemakaian bahan sekarang dihitung sepenuhnya di RPC Postgres
// `get_laporan_produksi` (lihat api.js & migration SQL). calcTotalTagihan
// adalah SATU-SATUNYA business math yang tersisa di frontend untuk fitur
// ini (lihat komentar di utils.js untuk alasan lengkap kenapa ini tidak
// ikut dipindahkan ke RPC).
describe("calcTotalTagihan", () => {
  it("sums total_harga across tagihan", () => {
    const tagihan = [{ total_harga: 50000 }, { total_harga: 30000 }];
    expect(calcTotalTagihan(tagihan)).toBe(80000);
  });
  it("returns 0 for empty array", () => {
    expect(calcTotalTagihan([])).toBe(0);
  });
  it("treats missing total_harga as 0", () => {
    const tagihan = [{ total_harga: 50000 }, {}];
    expect(calcTotalTagihan(tagihan)).toBe(50000);
  });
});
