import { describe, it, expect } from "vitest";
import {
  fmtRp,
  fmtRpShort,
  fmtNumber,
  fmtPercent,
  fmtDecimal,
  fmtPct1,
  fmtDate,
  fmtPeriode,
  localDateStr,
  defaultDateRange,
  dateRangeForDays,
  classifyMarginHealth,
  classifyReturnRateHealth,
  classifyRevenueTrendHealth,
  buildBusinessHealth,
  buildBiggestOpportunity,
  buildBiggestRisk,
  buildExecutiveInsights,
  buildRecommendations,
  buildPrioritizedQuickActions,
  trendDirection,
} from "./utils";
import { EXECUTIVE_OPPORTUNITY_LIMIT, EXECUTIVE_RISK_LIMIT, EXECUTIVE_INSIGHT_MAX } from "./constants";

describe("fmtRp", () => {
  it("formats integer", () => {
    expect(fmtRp(105000)).toBe("Rp 105.000");
  });
  it("handles null/undefined/0", () => {
    expect(fmtRp(null)).toBe("Rp 0");
    expect(fmtRp(undefined)).toBe("Rp 0");
    expect(fmtRp(0)).toBe("Rp 0");
  });
});

describe("fmtRpShort", () => {
  it("formats billions with M suffix", () => {
    expect(fmtRpShort(1_400_000_000)).toBe("Rp 1,4 M");
  });
  it("formats millions with jt suffix", () => {
    expect(fmtRpShort(145_600_000)).toBe("Rp 145,6 jt");
  });
  it("formats small numbers via fmtRp", () => {
    expect(fmtRpShort(50000)).toBe("Rp 50.000");
  });
  it("formats negative numbers with leading minus", () => {
    expect(fmtRpShort(-2_000_000)).toBe("-Rp 2,0 jt");
  });
  it("handles 0/null", () => {
    expect(fmtRpShort(0)).toBe("Rp 0");
    expect(fmtRpShort(null)).toBe("Rp 0");
  });
});

describe("fmtNumber", () => {
  it("formats with Indonesian thousands separator", () => {
    expect(fmtNumber(12345)).toBe("12.345");
  });
  it("handles null/undefined", () => {
    expect(fmtNumber(null)).toBe("0");
    expect(fmtNumber(undefined)).toBe("0");
  });
});

describe("fmtPercent", () => {
  it("formats a 0..1 ratio as percent with 1 decimal", () => {
    expect(fmtPercent(0.456)).toBe("45,6%");
  });
  it("formats negative ratio (margin negatif) apa adanya, tidak dikosongkan", () => {
    expect(fmtPercent(-0.1)).toBe("-10%");
  });
  it("handles null/undefined as 0%", () => {
    expect(fmtPercent(null)).toBe("0%");
    expect(fmtPercent(undefined)).toBe("0%");
  });
});

describe("fmtDecimal", () => {
  it("formats with default 2 max fraction digits", () => {
    expect(fmtDecimal(3.14159)).toBe("3,14");
  });
  it("formats with custom max fraction digits", () => {
    expect(fmtDecimal(3.14159, 1)).toBe("3,1");
  });
  it("does not pad trailing zeros", () => {
    expect(fmtDecimal(5)).toBe("5");
  });
  it("handles null/undefined as 0", () => {
    expect(fmtDecimal(null)).toBe("0");
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
  });
});

describe("fmtPeriode", () => {
  it("returns - for falsy periode", () => {
    expect(fmtPeriode(null, "day")).toBe("-");
  });
  it("formats day granularity as day+month", () => {
    const result = fmtPeriode("2024-03-15", "day");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Mar/);
  });
  it("formats month granularity as month+2digit year", () => {
    const result = fmtPeriode("2024-03-01", "month");
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/24/);
  });
  it("formats year granularity as year only", () => {
    const result = fmtPeriode("2024-01-01", "year");
    expect(result).toMatch(/2024/);
  });
  it("falls back to day-style format for unknown granularity (e.g. week)", () => {
    const result = fmtPeriode("2024-03-15", "week");
    expect(result).toMatch(/15/);
  });
});

describe("localDateStr", () => {
  it("formats a Date to YYYY-MM-DD using local time (not UTC)", () => {
    const d = new Date(2024, 0, 5); // 5 Jan 2024 local
    expect(localDateStr(d)).toBe("2024-01-05");
  });
  it("pads single-digit month/day", () => {
    const d = new Date(2024, 8, 3); // 3 Sep 2024
    expect(localDateStr(d)).toBe("2024-09-03");
  });
});

describe("defaultDateRange", () => {
  it("returns a 30-day range ending today (DEFAULT_RANGE_DAYS)", () => {
    const today = new Date(2024, 5, 30); // 30 Jun 2024
    const { fromDate, toDate } = defaultDateRange(today);
    expect(toDate).toBe("2024-06-30");
    expect(fromDate).toBe("2024-06-01"); // 30 hari terakhir termasuk hari ini
  });

  it("adalah wrapper tipis di atas dateRangeForDays(DEFAULT_RANGE_DAYS)", () => {
    const today = new Date(2024, 5, 30);
    expect(defaultDateRange(today)).toEqual(dateRangeForDays(30, today));
  });
});

describe("dateRangeForDays", () => {
  it("7 hari: rentang 7 hari terakhir termasuk hari ini", () => {
    const today = new Date(2024, 5, 30); // 30 Jun 2024
    const { fromDate, toDate } = dateRangeForDays(7, today);
    expect(toDate).toBe("2024-06-30");
    expect(fromDate).toBe("2024-06-24");
  });

  it("1 hari: fromDate sama dengan toDate", () => {
    const today = new Date(2024, 5, 30);
    const { fromDate, toDate } = dateRangeForDays(1, today);
    expect(fromDate).toBe(toDate);
    expect(toDate).toBe("2024-06-30");
  });

  it("365 hari: melewati batas tahun kalender dengan benar", () => {
    const today = new Date(2024, 5, 30); // 30 Jun 2024 (2024 kabisat)
    const { fromDate, toDate } = dateRangeForDays(365, today);
    expect(toDate).toBe("2024-06-30");
    expect(fromDate).toBe("2023-07-02");
  });

  it("default parameter today() dipakai kalau today tidak diberikan (tidak melempar error)", () => {
    expect(() => dateRangeForDays(30)).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Phase 9 — Executive Dashboard: fungsi derivasi murni (fmtPct1 +
// classify*/build* di utils.js). SELURUH input di sini adalah angka FINAL
// buatan tangan (mensimulasikan output RPC lain) — test ini memverifikasi
// fungsi HANYA memilih/membandingkan/mengklasifikasi/memformat, TIDAK
// menghitung ulang apa pun.
// ════════════════════════════════════════════════════════════════════════

describe("fmtPct1", () => {
  it("menambah suffix % tanpa kalkulasi apa pun (input SUDAH persen, mis. 45.2 = 45,2%)", () => {
    expect(fmtPct1(45.2)).toBe("45.2%");
    expect(fmtPct1(0)).toBe("0%");
  });
});

describe("classifyMarginHealth", () => {
  it("hijau kalau margin >= EXECUTIVE_MARGIN_HEALTHY_PCT (20%)", () => {
    expect(classifyMarginHealth(0.25)).toBe("green");
    expect(classifyMarginHealth(0.2)).toBe("green");
  });
  it("kuning kalau margin >= EXECUTIVE_MARGIN_WARNING_PCT (10%) tapi < 20%", () => {
    expect(classifyMarginHealth(0.15)).toBe("yellow");
    expect(classifyMarginHealth(0.1)).toBe("yellow");
  });
  it("merah kalau margin < 10%", () => {
    expect(classifyMarginHealth(0.05)).toBe("red");
    expect(classifyMarginHealth(null)).toBe("red");
  });
});

describe("classifyReturnRateHealth", () => {
  it("merah kalau return rate >= EXECUTIVE_RETURN_RATE_RISK (5%)", () => {
    expect(classifyReturnRateHealth(0.06)).toBe("red");
    expect(classifyReturnRateHealth(0.05)).toBe("red");
  });
  it("kuning kalau return rate >= EXECUTIVE_RETURN_RATE_WARNING (3%) tapi < 5%", () => {
    expect(classifyReturnRateHealth(0.04)).toBe("yellow");
    expect(classifyReturnRateHealth(0.03)).toBe("yellow");
  });
  it("hijau kalau return rate < 3%", () => {
    expect(classifyReturnRateHealth(0.01)).toBe("green");
    expect(classifyReturnRateHealth(0)).toBe("green");
  });
});

describe("classifyRevenueTrendHealth", () => {
  it("kuning (netral, BUKAN hijau/merah) kalau pctChange null — histori belum cukup", () => {
    expect(classifyRevenueTrendHealth(null)).toBe("yellow");
  });
  it("hijau kalau pctChange positif", () => {
    expect(classifyRevenueTrendHealth(12)).toBe("green");
  });
  it("merah kalau pctChange negatif", () => {
    expect(classifyRevenueTrendHealth(-8)).toBe("red");
  });
  it("kuning kalau pctChange persis 0 (stabil)", () => {
    expect(classifyRevenueTrendHealth(0)).toBe("yellow");
  });
});

describe("buildBusinessHealth", () => {
  it("momPctChange null -> item pertama 'Data belum cukup', status kuning", () => {
    const items = buildBusinessHealth({ momPctChange: null, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 0, overstockCount: 0 });
    expect(items[0]).toEqual({ status: "yellow", label: "Penjualan (Bulan ke Bulan)", detail: "Data belum cukup (perlu 2 bulan penuh riwayat)" });
  });
  it("momPctChange positif -> 'Naik X%', status hijau", () => {
    const items = buildBusinessHealth({ momPctChange: 10, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 0, overstockCount: 0 });
    expect(items[0]).toEqual({ status: "green", label: "Penjualan (Bulan ke Bulan)", detail: "Naik 10%" });
  });
  it("momPctChange negatif -> 'Turun X%' (nilai absolut), status merah", () => {
    const items = buildBusinessHealth({ momPctChange: -7, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 0, overstockCount: 0 });
    expect(items[0]).toEqual({ status: "red", label: "Penjualan (Bulan ke Bulan)", detail: "Turun 7%" });
  });
  it("SELALU menyertakan 3 item dasar (Penjualan Bulan ke Bulan, Status Keuntungan, Tingkat Retur) minimal", () => {
    const items = buildBusinessHealth({ momPctChange: 5, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 0, overstockCount: 0 });
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.label)).toEqual(["Penjualan (Bulan ke Bulan)", "Status Keuntungan", "Tingkat Retur"]);
  });
  it("deadStockCount > 0 -> tambah item Stok Tidak Bergerak (kuning)", () => {
    const items = buildBusinessHealth({ momPctChange: 5, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 3, overstockCount: 0 });
    expect(items).toHaveLength(4);
    expect(items[3]).toEqual({ status: "yellow", label: "Stok Tidak Bergerak", detail: "3 produk belum pernah terjual" });
  });
  it("overstockCount > 0 -> tambah item Stok Berlebih (kuning)", () => {
    const items = buildBusinessHealth({ momPctChange: 5, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 0, overstockCount: 2 });
    expect(items).toHaveLength(4);
    expect(items[3]).toEqual({ status: "yellow", label: "Stok Berlebih", detail: "2 produk kelebihan stok" });
  });
  it("deadStockCount=0 DAN overstockCount=0 -> TIDAK ada item tambahan (tetap 3)", () => {
    const items = buildBusinessHealth({ momPctChange: 5, overallMarginPct: 0.2, returnRate: 0.01, deadStockCount: 0, overstockCount: 0 });
    expect(items).toHaveLength(3);
  });
});

describe("buildBiggestOpportunity", () => {
  const restockForecast = [
    { kode: "D-01-OSK", forecastedDemandNextPeriod: 10, currentStock: 5, suggestedOrderQty: 15 },
    { kode: "D-02-SFN", forecastedDemandNextPeriod: 20, currentStock: 2, suggestedOrderQty: 25 },
    { kode: "D-03-MKN", forecastedDemandNextPeriod: 5, currentStock: 8, suggestedOrderQty: 3 },
  ];

  it("diurutkan DESC berdasarkan suggestedOrderQty (TIDAK mengurutkan input asli — immutable)", () => {
    const original = [...restockForecast];
    const result = buildBiggestOpportunity(restockForecast);
    expect(result.map((r) => r.kode)).toEqual(["D-02-SFN", "D-01-OSK", "D-03-MKN"]);
    expect(restockForecast).toEqual(original);
  });

  it("detail berisi demand/stok/suggested order APA ADANYA (tanpa kalkulasi baru)", () => {
    const result = buildBiggestOpportunity(restockForecast);
    expect(result[0]).toEqual({ kode: "D-02-SFN", detail: "Demand 20 pcs, stok 2 pcs — sarankan order 25 pcs" });
  });

  it("default limit = EXECUTIVE_OPPORTUNITY_LIMIT", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ kode: `D-${i}`, forecastedDemandNextPeriod: i, currentStock: 1, suggestedOrderQty: i }));
    const result = buildBiggestOpportunity(many);
    expect(result).toHaveLength(EXECUTIVE_OPPORTUNITY_LIMIT);
  });

  it("limit custom dihormati", () => {
    const result = buildBiggestOpportunity(restockForecast, 1);
    expect(result).toHaveLength(1);
    expect(result[0].kode).toBe("D-02-SFN");
  });

  it("array kosong -> hasil kosong", () => {
    expect(buildBiggestOpportunity([])).toEqual([]);
  });
});

describe("buildBiggestRisk", () => {
  const deadStock = [{ kode: "D-05-ABC", value: 30 }, { kode: "D-06-DEF", value: 45 }];
  const negativeMarginProducts = [{ kode: "D-09-XYZ", revenue: 200000, marginPct: -5.2 }];

  it("menggabungkan deadStock + negativeMarginProducts dengan category & detail sesuai sumber", () => {
    const result = buildBiggestRisk({ deadStock, negativeMarginProducts });
    expect(result).toEqual([
      { kode: "D-05-ABC", category: "Stok Tidak Bergerak", detail: "Belum pernah terjual" },
      { kode: "D-06-DEF", category: "Stok Tidak Bergerak", detail: "Belum pernah terjual" },
      { kode: "D-09-XYZ", category: "Margin Negatif", detail: "-5,2% (jual rugi)" },
    ]);
  });

  it("default limit = EXECUTIVE_RISK_LIMIT", () => {
    const manyDead = Array.from({ length: 8 }, (_, i) => ({ kode: `D-${i}`, value: i }));
    const result = buildBiggestRisk({ deadStock: manyDead, negativeMarginProducts: [] });
    expect(result).toHaveLength(EXECUTIVE_RISK_LIMIT);
  });

  it("limit custom dihormati", () => {
    const result = buildBiggestRisk({ deadStock, negativeMarginProducts }, 2);
    expect(result).toHaveLength(2);
  });

  it("kedua sumber kosong -> hasil kosong", () => {
    expect(buildBiggestRisk({ deadStock: [], negativeMarginProducts: [] })).toEqual([]);
  });
});

describe("buildExecutiveInsights", () => {
  const fullContext = {
    overview: {
      quickInsight: {
        pasarTerbaik: { location: "cideng", value: 700000 },
        produkTerlaris: { kode: "D-01-OSK", nama: "Gamis A", value: 20 },
      },
    },
    advanced: {
      periodComparison: { mom: { currentRevenue: 5000000, previousRevenue: 4000000, pctChange: 25 } },
      kpi: { overallMarginPct: 0.24, returnRate: 0.06, returnRevenueImpact: 150000 },
      marginRisk: { negativeMarginProducts: [{ kode: "D-09-XYZ", revenue: 200000, marginPct: -5.2 }] },
      revenueConcentration: { top5Pct: 62.1 },
      newVsReturning: { newRevenue: 1000000, returningRevenue: 2000000 },
    },
    inventory: { stockHealth: { dead: 2 } },
    forecast: { revenueForecast: { history: [{ periode: "2024-03-25", value: 100 }], es: 120 } },
  };

  it("dengan SELURUH kondisi terpenuhi, hasil <= EXECUTIVE_INSIGHT_MAX", () => {
    const insights = buildExecutiveInsights(fullContext);
    expect(insights.length).toBeLessThanOrEqual(EXECUTIVE_INSIGHT_MAX);
    expect(insights.length).toBeGreaterThan(5);
  });

  it("insight Persentase Keuntungan Keseluruhan SELALU disertakan (tidak butuh syarat data)", () => {
    const insights = buildExecutiveInsights(fullContext);
    expect(insights.some((i) => i.includes("Persentase keuntungan keseluruhan saat ini"))).toBe(true);
  });

  it("insight 5 Produk Teratas Menyumbang SELALU disertakan", () => {
    const insights = buildExecutiveInsights(fullContext);
    expect(insights.some((i) => i.includes("5 produk teratas menyumbang"))).toBe(true);
  });

  it("insight MoM HANYA muncul kalau periodComparison.mom ada", () => {
    const withMom = buildExecutiveInsights(fullContext);
    expect(withMom.some((i) => i.includes("Penjualan bulan lalu naik"))).toBe(true);

    const withoutMom = buildExecutiveInsights({
      ...fullContext,
      advanced: { ...fullContext.advanced, periodComparison: { mom: null } },
    });
    expect(withoutMom.some((i) => i.includes("Penjualan bulan lalu"))).toBe(false);
  });

  it("insight Stok Tidak Bergerak HANYA muncul kalau count > 0", () => {
    const withDead = buildExecutiveInsights(fullContext);
    expect(withDead.some((i) => i.includes("stok tidak bergerak"))).toBe(true);

    const withoutDead = buildExecutiveInsights({
      ...fullContext,
      inventory: { stockHealth: { dead: 0 } },
    });
    expect(withoutDead.some((i) => i.includes("stok tidak bergerak"))).toBe(false);
  });

  it("insight Tingkat Retur HANYA muncul kalau >= EXECUTIVE_RETURN_RATE_WARNING", () => {
    const withHighReturn = buildExecutiveInsights(fullContext);
    expect(withHighReturn.some((i) => i.includes("Tingkat retur"))).toBe(true);

    const withLowReturn = buildExecutiveInsights({
      ...fullContext,
      advanced: { ...fullContext.advanced, kpi: { ...fullContext.advanced.kpi, returnRate: 0.01 } },
    });
    expect(withLowReturn.some((i) => i.includes("Tingkat retur"))).toBe(false);
  });

  it("insight Forecast Trend HANYA muncul kalau es & histori tersedia (bukan mengarang)", () => {
    const withForecast = buildExecutiveInsights(fullContext);
    expect(withForecast.some((i) => i.includes("Perkiraan penjualan periode berikutnya"))).toBe(true);

    const withoutForecast = buildExecutiveInsights({
      ...fullContext,
      forecast: { revenueForecast: { history: [], es: null } },
    });
    expect(withoutForecast.some((i) => i.includes("Perkiraan penjualan periode berikutnya"))).toBe(false);
  });

  it("insight New vs Returning HANYA muncul kalau total revenue pelanggan bernama > 0", () => {
    const withRevenue = buildExecutiveInsights(fullContext);
    expect(withRevenue.some((i) => i.includes("pelanggan baru"))).toBe(true);

    const withoutRevenue = buildExecutiveInsights({
      ...fullContext,
      advanced: { ...fullContext.advanced, newVsReturning: { newRevenue: 0, returningRevenue: 0 } },
    });
    expect(withoutRevenue.some((i) => i.includes("pelanggan baru"))).toBe(false);
  });

  it("konteks minimal (SEMUA kondisi opsional kosong/null) -> hanya 2 insight yang SELALU ada", () => {
    const minimal = buildExecutiveInsights({
      overview: { quickInsight: { pasarTerbaik: null, produkTerlaris: null } },
      advanced: {
        periodComparison: { mom: null },
        kpi: { overallMarginPct: 0, returnRate: 0, returnRevenueImpact: 0 },
        marginRisk: { negativeMarginProducts: [] },
        revenueConcentration: { top5Pct: 0 },
        newVsReturning: { newRevenue: 0, returningRevenue: 0 },
      },
      inventory: { stockHealth: { dead: 0 } },
      forecast: { revenueForecast: { history: [], es: null } },
    });
    expect(minimal).toHaveLength(2);
  });
});

describe("buildRecommendations", () => {
  it("restock -> template dengan sampai 3 kode, tambah 'dan lainnya' kalau > 3", () => {
    const recs = buildRecommendations({
      advanced: { marginRisk: { negativeMarginProducts: [] }, marketConcentration: [] },
      inventory: { suggestedRestock: [{ kode: "A" }, { kode: "B" }, { kode: "C" }, { kode: "D" }], stockHealth: { overstock: 0 }, overstock: [] },
      forecast: { restockForecast: [] },
    });
    expect(recs).toEqual(["Restock produk: A, B, C, dan lainnya."]);
  });

  it("margin negatif -> template evaluasi harga/modal", () => {
    const recs = buildRecommendations({
      advanced: { marginRisk: { negativeMarginProducts: [{ kode: "D-09-XYZ" }] }, marketConcentration: [] },
      inventory: { suggestedRestock: [], stockHealth: { overstock: 0 }, overstock: [] },
      forecast: { restockForecast: [] },
    });
    expect(recs).toEqual(["Evaluasi harga/modal produk yang terjual rugi: D-09-XYZ."]);
  });

  it("overstock -> template kurangi/tunda produksi, pakai kode kalau ada", () => {
    const recs = buildRecommendations({
      advanced: { marginRisk: { negativeMarginProducts: [] }, marketConcentration: [] },
      inventory: { suggestedRestock: [], stockHealth: { overstock: 2 }, overstock: [{ kode: "D-03-MKN" }] },
      forecast: { restockForecast: [] },
    });
    expect(recs).toEqual(["Kurangi/tunda produksi produk stok berlebih: D-03-MKN."]);
  });

  it("market concentration -> fokus promosi ke cabang kontribusi tertinggi (pakai LOCATION_LABELS)", () => {
    const recs = buildRecommendations({
      advanced: {
        marginRisk: { negativeMarginProducts: [] },
        marketConcentration: [{ location: "gudang", value: 1000000, pct: 40 }, { location: "cideng", value: 3000000, pct: 60 }],
      },
      inventory: { suggestedRestock: [], stockHealth: { overstock: 0 }, overstock: [] },
      forecast: { restockForecast: [] },
    });
    expect(recs).toEqual(["Fokuskan promosi di cabang Cideng (kontribusi penjualan tertinggi, 60%)."]);
  });

  it("restockForecast -> siapkan stok perkiraan permintaan", () => {
    const recs = buildRecommendations({
      advanced: { marginRisk: { negativeMarginProducts: [] }, marketConcentration: [] },
      inventory: { suggestedRestock: [], stockHealth: { overstock: 0 }, overstock: [] },
      forecast: { restockForecast: [{ kode: "D-01-OSK" }] },
    });
    expect(recs).toEqual(["Siapkan stok untuk perkiraan permintaan periode berikutnya: D-01-OSK."]);
  });

  it("semua kondisi kosong -> hasil kosong", () => {
    const recs = buildRecommendations({
      advanced: { marginRisk: { negativeMarginProducts: [] }, marketConcentration: [] },
      inventory: { suggestedRestock: [], stockHealth: { overstock: 0 }, overstock: [] },
      forecast: { restockForecast: [] },
    });
    expect(recs).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Redesign UI/UX (2026-07) — Tindakan Prioritas (Ringkasan Bisnis):
// buildPrioritizedQuickActions() (Tinggi/Sedang/Rendah) + trendDirection
// (sekarang diekspor, dipakai juga oleh fungsi ini).
// ════════════════════════════════════════════════════════════════════════

describe("trendDirection (diekspor sejak redesign 2026-07)", () => {
  it("null kalau es null atau histori kosong", () => {
    expect(trendDirection([], 100)).toBeNull();
    expect(trendDirection([{ periode: "2024-01-01", value: 10 }], null)).toBeNull();
  });
  it("'naik' kalau es > titik histori terakhir", () => {
    expect(trendDirection([{ periode: "2024-01-01", value: 10 }], 15)).toBe("naik");
  });
  it("'turun' kalau es < titik histori terakhir", () => {
    expect(trendDirection([{ periode: "2024-01-01", value: 10 }], 5)).toBe("turun");
  });
  it("'stabil' kalau es === titik histori terakhir", () => {
    expect(trendDirection([{ periode: "2024-01-01", value: 10 }], 10)).toBe("stabil");
  });
});

describe("buildPrioritizedQuickActions", () => {
  const EMPTY = {
    restockCount: 0,
    restockKodes: [],
    criticalStockCount: 0,
    negativeMarginCount: 0,
    lowStockCount: 0,
    deadStockCount: 0,
    demandTrend: null,
    revenueMomPctChange: null,
  };

  it("seluruh input kosong -> ketiga keranjang kosong (TIDAK mengarang tindakan)", () => {
    const result = buildPrioritizedQuickActions(EMPTY);
    expect(result).toEqual({ tinggi: [], sedang: [], rendah: [] });
  });

  it("Prioritas Tinggi: restock, stok kritis, margin negatif", () => {
    const result = buildPrioritizedQuickActions({
      ...EMPTY,
      restockCount: 3,
      restockKodes: ["D-01", "D-02"],
      criticalStockCount: 2,
      negativeMarginCount: 1,
    });
    expect(result.tinggi).toEqual([
      { label: "3 produk perlu segera ditambah stoknya.", detail: "Termasuk: D-01, D-02." },
      { label: "2 produk stoknya kritis, hampir habis.", detail: null },
      { label: "1 produk terjual di bawah harga modal (rugi).", detail: null },
    ]);
    expect(result.sedang).toEqual([]);
    expect(result.rendah).toEqual([]);
  });

  it("restock tanpa restockKodes -> detail null (bukan string kosong)", () => {
    const result = buildPrioritizedQuickActions({ ...EMPTY, restockCount: 2 });
    expect(result.tinggi[0]).toEqual({ label: "2 produk perlu segera ditambah stoknya.", detail: null });
  });

  it("Prioritas Sedang: stok menipis, dead stock", () => {
    const result = buildPrioritizedQuickActions({ ...EMPTY, lowStockCount: 4, deadStockCount: 5 });
    expect(result.sedang).toEqual([
      { label: "4 produk stoknya mulai menipis.", detail: null },
      { label: "5 produk sudah lama tidak terjual sama sekali.", detail: null },
    ]);
    expect(result.tinggi).toEqual([]);
  });

  it("Prioritas Rendah: demand naik, revenue MoM naik", () => {
    const result = buildPrioritizedQuickActions({ ...EMPTY, demandTrend: "naik", revenueMomPctChange: 12 });
    expect(result.rendah).toEqual([
      { label: "Perkiraan permintaan produk meningkat pada periode berikutnya.", detail: null },
      { label: "Penjualan naik 12% dibanding bulan sebelumnya.", detail: null },
    ]);
  });

  it("demandTrend 'turun'/'stabil' TIDAK memicu insight 'meningkat' (jangan mengarang arah sebaliknya)", () => {
    expect(buildPrioritizedQuickActions({ ...EMPTY, demandTrend: "turun" }).rendah).toEqual([]);
    expect(buildPrioritizedQuickActions({ ...EMPTY, demandTrend: "stabil" }).rendah).toEqual([]);
  });

  it("revenueMomPctChange negatif atau null TIDAK memicu insight 'naik'", () => {
    expect(buildPrioritizedQuickActions({ ...EMPTY, revenueMomPctChange: -5 }).rendah).toEqual([]);
    expect(buildPrioritizedQuickActions({ ...EMPTY, revenueMomPctChange: null }).rendah).toEqual([]);
  });

  it("ketiga keranjang bisa terisi BERSAMAAN sesuai kondisi masing-masing", () => {
    const result = buildPrioritizedQuickActions({
      restockCount: 1,
      restockKodes: ["D-09"],
      criticalStockCount: 0,
      negativeMarginCount: 0,
      lowStockCount: 2,
      deadStockCount: 0,
      demandTrend: "naik",
      revenueMomPctChange: 0,
    });
    expect(result.tinggi).toHaveLength(1);
    expect(result.sedang).toHaveLength(1);
    expect(result.rendah).toHaveLength(1);
  });
});
