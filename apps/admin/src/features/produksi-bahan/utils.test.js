import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fmtRp, fmtDate, fmtDateShort, addFourMonths, daysUntil,
  fmtBulan, fmtTanggalLengkap, groupTagihanPerBulan, generateTagihanWA,
  filterBahanItems, sumBelumLunas, findRelatedPinjamRows,
  inputCls, labelCls, TABS,
} from "./utils";

describe("fmtRp", () => {
  it("formats valid number with Rp prefix", () => {
    expect(fmtRp(50000)).toContain("Rp");
    expect(fmtRp(50000)).toContain("50");
  });
  it("returns Rp 0 for zero", () => expect(fmtRp(0)).toContain("0"));
  it("returns Rp 0 for non-number", () => expect(fmtRp("abc")).toContain("0"));
});

describe("fmtDate", () => {
  it("returns '-' for null", () => expect(fmtDate(null)).toBe("-"));
  it("returns '-' for undefined", () => expect(fmtDate(undefined)).toBe("-"));
  it("returns non-empty string for valid date", () => {
    const result = fmtDate("2024-05-10");
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
  });
});

describe("fmtDateShort", () => {
  it("returns '-' for null", () => expect(fmtDateShort(null)).toBe("-"));
  it("returns non-empty string for valid date", () => {
    const result = fmtDateShort("2024-05-10");
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
  });
});

describe("addFourMonths", () => {
  it("adds 4 months to a date string", () => {
    const result = addFourMonths("2024-01-15");
    expect(result).toBe("2024-05-15");
  });
  it("handles year rollover", () => {
    const result = addFourMonths("2024-10-01");
    expect(result).toBe("2025-02-01");
  });
  it("returns ISO date string format", () => {
    const result = addFourMonths("2024-03-10");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("daysUntil", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns positive days for future date", () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    expect(daysUntil("2024-01-11")).toBe(10);
  });
  it("returns 0 for today", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
    expect(daysUntil("2024-06-15")).toBe(0);
  });
  it("returns negative days for past date", () => {
    vi.setSystemTime(new Date("2024-01-11T00:00:00.000Z"));
    expect(daysUntil("2024-01-01")).toBe(-10);
  });
});

describe("fmtBulan", () => {
  it("returns '—' for falsy input", () => expect(fmtBulan(null)).toBe("—"));
  it("returns '—' for empty string", () => expect(fmtBulan("")).toBe("—"));
  it("formats Jan 2024", () => expect(fmtBulan("2024-01")).toBe("Jan 2024"));
  it("formats Jun 2023", () => expect(fmtBulan("2023-06")).toBe("Jun 2023"));
  it("formats Des 2024", () => expect(fmtBulan("2024-12")).toBe("Des 2024"));
});

describe("fmtTanggalLengkap", () => {
  it("returns '—' for falsy input", () => expect(fmtTanggalLengkap(null)).toBe("—"));
  it("returns non-empty string for valid date", () => {
    const result = fmtTanggalLengkap("2024-05-10");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});

describe("groupTagihanPerBulan", () => {
  const items = [
    { id: 1, status_bayar: "belum", jatuh_tempo: "2024-03-15", total_harga: 10000 },
    { id: 2, status_bayar: "belum", jatuh_tempo: "2024-03-20", total_harga: 5000 },
    { id: 3, status_bayar: "lunas", jatuh_tempo: "2024-03-01", total_harga: 8000 },
    { id: 4, status_bayar: "belum", jatuh_tempo: "2024-04-01", total_harga: 3000 },
    { id: 5, status_bayar: "belum", jatuh_tempo: null, total_harga: 2000 },
  ];

  it("excludes lunas items", () => {
    const groups = groupTagihanPerBulan(items);
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.some((i) => i.status_bayar === "lunas")).toBe(false);
  });
  it("excludes items with no jatuh_tempo", () => {
    const groups = groupTagihanPerBulan(items);
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.some((i) => !i.jatuh_tempo)).toBe(false);
  });
  it("groups by month", () => {
    const groups = groupTagihanPerBulan(items);
    expect(groups.length).toBe(2);
    expect(groups[0].bulan).toBe("2024-03");
    expect(groups[1].bulan).toBe("2024-04");
  });
  it("sums total per group", () => {
    const groups = groupTagihanPerBulan(items);
    expect(groups[0].total).toBe(15000);
  });
  it("returns empty array when all lunas", () => {
    const allLunas = [{ id: 1, status_bayar: "lunas", jatuh_tempo: "2024-03-01", total_harga: 5000 }];
    expect(groupTagihanPerBulan(allLunas)).toEqual([]);
  });
});

describe("generateTagihanWA", () => {
  it("returns 'tidak ada tagihan' for empty groups", () => {
    expect(generateTagihanWA([])).toContain("Tidak ada tagihan");
  });
  it("includes DEERA brand", () => {
    const groups = [{
      bulan: "2024-03",
      total: 50000,
      items: [{ nama_bahan: "Wolfis", motif: "", tanggal: "2024-02-01", jumlah: 5, satuan: "yard", jatuh_tempo: "2024-03-15", total_harga: 50000 }],
    }];
    const result = generateTagihanWA(groups);
    expect(result).toContain("DEERA");
  });
  it("includes grand total", () => {
    const groups = [{
      bulan: "2024-03",
      total: 50000,
      items: [{ nama_bahan: "Wolfis", motif: null, tanggal: "2024-02-01", jumlah: 5, satuan: "yard", jatuh_tempo: "2024-03-15", total_harga: 50000 }],
    }];
    const result = generateTagihanWA(groups);
    expect(result).toContain("50");
  });
  it("includes motif when present", () => {
    const groups = [{
      bulan: "2024-03",
      total: 10000,
      items: [{ nama_bahan: "Sifon", motif: "Bunga", tanggal: "2024-02-01", jumlah: 2, satuan: "yard", jatuh_tempo: "2024-03-15", total_harga: 10000 }],
    }];
    const result = generateTagihanWA(groups);
    expect(result).toContain("Bunga");
  });
});

describe("filterBahanItems", () => {
  const items = [
    { id: 1, nama_bahan: "Wolfis Putih", kode_bahan: "WLF-01", nama_pemberi: "Toko A", status_bayar: "belum" },
    { id: 2, nama_bahan: "Sifon Hitam",  kode_bahan: "SFN-02", nama_pemberi: "Toko B", status_bayar: "lunas" },
    { id: 3, nama_bahan: "Katun Biru",   kode_bahan: null,     nama_pemberi: "Toko A", status_bayar: "belum" },
  ];

  it("returns all items when filterStatus=semua and no search", () => {
    expect(filterBahanItems(items, "semua", "")).toHaveLength(3);
  });
  it("filters by status belum", () => {
    const result = filterBahanItems(items, "belum", "");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.status_bayar === "belum")).toBe(true);
  });
  it("filters by status lunas", () => {
    const result = filterBahanItems(items, "lunas", "");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
  it("filters by search on nama_bahan", () => {
    const result = filterBahanItems(items, "semua", "wolfis");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
  it("filters by search on kode_bahan", () => {
    const result = filterBahanItems(items, "semua", "sfn");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
  it("filters by search on nama_pemberi", () => {
    const result = filterBahanItems(items, "semua", "toko a");
    expect(result).toHaveLength(2);
  });
  it("combines status and search filter", () => {
    const result = filterBahanItems(items, "belum", "wolfis");
    expect(result).toHaveLength(1);
  });
  it("handles null kode_bahan gracefully", () => {
    expect(() => filterBahanItems(items, "semua", "xyz")).not.toThrow();
  });
});

describe("sumBelumLunas", () => {
  it("sums only status_bayar=belum items", () => {
    const items = [
      { total_harga: 10000, status_bayar: "belum" },
      { total_harga: 5000, status_bayar: "lunas" },
      { total_harga: 3000, status_bayar: "belum" },
    ];
    expect(sumBelumLunas(items)).toBe(13000);
  });
  it("returns 0 for empty items", () => expect(sumBelumLunas([])).toBe(0));
  it("returns 0 when all lunas", () => {
    expect(sumBelumLunas([{ total_harga: 5000, status_bayar: "lunas" }])).toBe(0);
  });
});

describe("findRelatedPinjamRows", () => {
  const items = [
    { id: 1, nama_pemberi: "Toko A", tanggal: "2024-01-10", nama_bahan: "Wolfis" },
    { id: 2, nama_pemberi: "Toko A", tanggal: "2024-01-10", nama_bahan: "Sifon" },
    { id: 3, nama_pemberi: "Toko B", tanggal: "2024-01-10", nama_bahan: "Katun" },
  ];

  it("returns all items with same nama_pemberi and tanggal", () => {
    const result = findRelatedPinjamRows(items, items[0]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });
  it("returns clicked item alone when no match", () => {
    const clicked = { id: 99, nama_pemberi: "Unknown", tanggal: "2024-01-10" };
    const result = findRelatedPinjamRows(items, clicked);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(clicked);
  });
});

describe("constants", () => {
  it("inputCls is a non-empty string", () => expect(typeof inputCls).toBe("string"));
  it("labelCls is a non-empty string", () => expect(typeof labelCls).toBe("string"));
});
