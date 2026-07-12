import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@deera/shared/lib/supabase";
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTrend,
  fetchAnalyticsProducts,
  fetchAnalyticsMarkets,
  fetchAnalyticsMarketDetail,
  fetchAnalyticsCustomers,
  fetchAnalyticsAdvanced,
  fetchAnalyticsInventory,
  fetchAnalyticsForecast,
} from "./api";

beforeEach(() => vi.clearAllMocks());

const EMPTY_OVERVIEW = {
  kpi: { totalRevenue: 0, totalProfit: 0, totalQty: 0, totalTransaksi: 0, totalCustomer: 0, aov: 0 },
  quickInsight: { produkTerlaris: null, produkProfitTertinggi: null, pasarTerbaik: null, customerTerbaik: null },
  marketSummary: [],
  trend: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
};

const EMPTY_PRODUCTS = {
  leaderboard: { terlaris: [], omsetTertinggi: [], profitTertinggi: [], marginTertinggi: [], marginTerendah: [] },
  harga: { hppTertinggi: [], hppTerendah: [], hargaJualTertinggi: [], hargaJualTerendah: [] },
  movement: { fastMoving: [], slowMoving: [] },
  inventory: { stokTerbanyak: [], stokHampirHabis: [], tidakPernahTerjual: [], tidakAdaPenjualanPeriode: [] },
};

const EMPTY_MARKETS = { markets: [] };

const EMPTY_MARKET_DETAIL = {
  revenue: 0,
  profit: 0,
  qty: 0,
  customer: 0,
  produkTerlaris: [],
  trend: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
};

const EMPTY_CUSTOMERS = {
  leaderboard: { revenueTertinggi: [], profitTertinggi: [], qtyTerbanyak: [] },
  insight: {
    customerBaru: 0,
    repeatCustomer: 0,
    avgOrder: 0,
    ltv: 0,
    anonymousTransactionCount: 0,
    anonymousRevenue: 0,
  },
  ranking: [],
};

const EMPTY_ADVANCED = {
  kpi: { returnRate: 0, returnRevenueImpact: 0, overallMarginPct: 0, avgBasketSize: 0, avgItemPerTransaksi: 0 },
  growth: { topGrowth: [], topDeclining: [] },
  contribution: { revenueByProduct: [], profitByProduct: [] },
  productMix: [],
  pareto: { items: [], productsFor80Pct: 0, totalProducts: 0 },
  newVsReturning: { newRevenue: 0, returningRevenue: 0, anonymousRevenue: 0, newCustomerCount: 0, returningCustomerCount: 0 },
  weekdayPerformance: [],
  hourlyPerformance: [],
  periodComparison: { mom: null, yoy: null, wow: null },
  abcClassification: {
    thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
    a: { count: 0, revenuePct: 0 },
    b: { count: 0, revenuePct: 0 },
    c: { count: 0, revenuePct: 0 },
  },
  revenueConcentration: { top5Pct: 0, top10Pct: 0 },
  customerConcentration: { top5Pct: 0, top5CustomerCount: 0, totalIdentifiedCustomers: 0 },
  marketConcentration: [],
  marginRisk: { lowMarginThresholdPct: 10, negativeMarginProducts: [], lowMarginProducts: [] },
  salesDistribution: {
    weekday: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
    weekend: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
  },
};

const EMPTY_INVENTORY = {
  summary: { totalInventoryValue: 0, totalSkuWithStock: 0, avgDailyCogs: 0, daysOfInventory: 0, inventoryTurnover: 0, method: "days_of_inventory_from_current_stock_and_period_cogs" },
  stockHealth: { dead: 0, critical: 0, low: 0, healthy: 0, overstock: 0, noMovementPeriod: 0 },
  deadStock: [],
  agingStock: [],
  overstock: [],
  understock: [],
  suggestedRestock: [],
  restockPriority: [],
  stockRiskIndicator: [],
};

const EMPTY_FORECAST_SERIES = { history: [], ma: null, wma: null, es: null };
const EMPTY_FORECAST = {
  meta: { granularity: "week", historyBucketCount: 0, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: null },
  revenueForecast: EMPTY_FORECAST_SERIES,
  profitForecast: EMPTY_FORECAST_SERIES,
  salesForecast: EMPTY_FORECAST_SERIES,
  customerForecast: EMPTY_FORECAST_SERIES,
  productDemandForecast: [],
  restockForecast: [],
};

describe("fetchAnalyticsOverview", () => {
  it("memanggil rpc('analytics_overview') dengan p_from/p_to/p_location/p_kode", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_OVERVIEW, error: null });

    await fetchAnalyticsOverview({ fromDate: "2024-01-01", toDate: "2024-01-31", location: "cideng", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_overview", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: "cideng",
      p_kode: "D-01",
    });
  });

  it("location/kode undefined dikirim sebagai null (bukan undefined)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_OVERVIEW, error: null });

    await fetchAnalyticsOverview({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_overview", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: null,
      p_kode: null,
    });
  });

  it("meneruskan hasil RPC apa adanya", async () => {
    const rpcResult = {
      kpi: { totalRevenue: 1000000, totalProfit: 200000, totalQty: 10, totalTransaksi: 5, totalCustomer: 3, aov: 200000 },
      quickInsight: {
        produkTerlaris: { kode: "D-01", nama: "Gamis A", value: 10 },
        produkProfitTertinggi: null,
        pasarTerbaik: { location: "cideng", value: 200000 },
        customerTerbaik: null,
      },
      marketSummary: [{ location: "cideng", revenue: 1000000, profit: 200000, qty: 10 }],
      trend: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsOverview({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong (bukan error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsOverview({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_OVERVIEW);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsOverview({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_OVERVIEW);
  });
});

describe("fetchAnalyticsTrend", () => {
  it("memanggil rpc('analytics_trend') dengan seluruh parameter termasuk granularity", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { granularity: "week", buckets: [], topProductTrend: [], marketTrend: [] },
      error: null,
    });

    await fetchAnalyticsTrend({
      fromDate: "2024-01-01",
      toDate: "2024-03-31",
      location: null,
      kode: null,
      granularity: "week",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_trend", {
      p_from: "2024-01-01",
      p_to: "2024-03-31",
      p_location: null,
      p_kode: null,
      p_granularity: "week",
    });
  });

  it("granularity undefined -> fallback ke 'day' sebagai parameter RPC", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
      error: null,
    });

    await fetchAnalyticsTrend({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "analytics_trend",
      expect.objectContaining({ p_granularity: "day" }),
    );
  });

  it("meneruskan hasil RPC apa adanya", async () => {
    const rpcResult = {
      granularity: "day",
      buckets: [{ periode: "2024-01-01", revenue: 100000, profit: 20000, qty: 2 }],
      topProductTrend: [{ kode: "D-01", nama: "Gamis A", points: [{ periode: "2024-01-01", qty: 2 }] }],
      marketTrend: [{ location: "cideng", points: [{ periode: "2024-01-01", revenue: 100000 }] }],
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsTrend({ fromDate: "2024-01-01", toDate: "2024-01-31", granularity: "day" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong dengan granularity yang diminta", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsTrend({ fromDate: "2024-01-01", toDate: "2024-01-31", granularity: "month" });

    expect(result).toEqual({ granularity: "month", buckets: [], topProductTrend: [], marketTrend: [] });
  });
});

describe("fetchAnalyticsProducts", () => {
  it("memanggil rpc('analytics_products') dengan seluruh parameter termasuk p_low_stock_cover_days", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_PRODUCTS, error: null });

    await fetchAnalyticsProducts({
      fromDate: "2024-01-01",
      toDate: "2024-01-31",
      location: "cideng",
      kode: "D-01",
      lowStockCoverDays: 7,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_products", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: "cideng",
      p_kode: "D-01",
      p_low_stock_cover_days: 7,
    });
  });

  it("location/kode undefined dikirim sebagai null, lowStockCoverDays undefined fallback ke 7", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_PRODUCTS, error: null });

    await fetchAnalyticsProducts({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_products", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: null,
      p_kode: null,
      p_low_stock_cover_days: 7,
    });
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      leaderboard: {
        terlaris: [{ kode: "D-01-OSK", value: 15 }],
        omsetTertinggi: [{ kode: "D-01-OSK", value: 3000000 }],
        profitTertinggi: [{ kode: "D-01-OSK", value: 700000 }],
        marginTertinggi: [{ kode: "D-01-OSK", value: 0.35 }],
        marginTerendah: [{ kode: "D-02-SFN", value: -0.05 }],
      },
      harga: {
        hppTertinggi: [{ kode: "D-01-OSK", value: 100000 }],
        hppTerendah: [{ kode: "D-02-SFN", value: 60000 }],
        hargaJualTertinggi: [{ kode: "D-01-OSK", value: 250000 }],
        hargaJualTerendah: [{ kode: "D-02-SFN", value: 150000 }],
      },
      movement: {
        fastMoving: [{ kode: "D-01-OSK", value: 2.5 }],
        slowMoving: [{ kode: "D-02-SFN", value: 0.1 }],
      },
      inventory: {
        stokTerbanyak: [{ kode: "D-01-OSK", value: 120 }],
        stokHampirHabis: [{ kode: "D-02-SFN", value: 3.2 }],
        tidakPernahTerjual: [{ kode: "D-03-MKN", value: 10 }],
        tidakAdaPenjualanPeriode: [{ kode: "D-04-CTN", value: 5 }],
      },
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsProducts({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong (bukan error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsProducts({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_PRODUCTS);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsProducts({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_PRODUCTS);
  });
});


describe("fetchAnalyticsMarkets", () => {
  it("memanggil rpc('analytics_markets') dengan p_from/p_to/p_kode TANPA p_location", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_MARKETS, error: null });

    await fetchAnalyticsMarkets({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_markets", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_kode: "D-01",
    });
  });

  it("TIDAK PERNAH mengirim p_location — RPC ini sengaja tidak menerima parameter itu", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_MARKETS, error: null });

    await fetchAnalyticsMarkets({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: null });

    const callArgs = supabase.rpc.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty("p_location");
  });

  it("kode undefined dikirim sebagai null", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_MARKETS, error: null });

    await fetchAnalyticsMarkets({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_markets", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_kode: null,
    });
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      markets: [
        { location: "cideng", revenue: 3000000, profit: 700000, qty: 15, customer: 5 },
        { location: "gudang", revenue: 2000000, profit: 500000, qty: 10, customer: 3 },
        { location: "tegalgubug", revenue: 0, profit: 0, qty: 0, customer: 0 },
      ],
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsMarkets({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: null });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong (bukan error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsMarkets({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: null });

    expect(result).toEqual(EMPTY_MARKETS);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsMarkets({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: null }),
    ).resolves.toEqual(EMPTY_MARKETS);
  });
});

describe("fetchAnalyticsMarketDetail", () => {
  it("memanggil rpc('analytics_market_detail') dengan p_market/p_from/p_to/p_kode", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_MARKET_DETAIL, error: null });

    await fetchAnalyticsMarketDetail({ market: "cideng", fromDate: "2024-01-01", toDate: "2024-01-31", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_market_detail", {
      p_market: "cideng",
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_kode: "D-01",
    });
  });

  it("kode undefined dikirim sebagai null", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_MARKET_DETAIL, error: null });

    await fetchAnalyticsMarketDetail({ market: "gudang", fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_market_detail", {
      p_market: "gudang",
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_kode: null,
    });
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      revenue: 3000000,
      profit: 700000,
      qty: 15,
      customer: 5,
      produkTerlaris: [{ kode: "D-01-OSK", value: 10 }],
      trend: {
        granularity: "day",
        buckets: [{ periode: "2024-01-01", revenue: 100000, profit: 20000, qty: 2 }],
        topProductTrend: [],
        marketTrend: [],
      },
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsMarketDetail({ market: "cideng", fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong (bukan error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsMarketDetail({ market: "cideng", fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_MARKET_DETAIL);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsMarketDetail({ market: "cideng", fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_MARKET_DETAIL);
  });
});


describe("fetchAnalyticsCustomers", () => {
  it("memanggil rpc('analytics_customers') dengan p_from/p_to/p_location/p_kode", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_CUSTOMERS, error: null });

    await fetchAnalyticsCustomers({ fromDate: "2024-01-01", toDate: "2024-01-31", location: "cideng", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_customers", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: "cideng",
      p_kode: "D-01",
    });
  });

  it("location/kode undefined dikirim sebagai null (bukan undefined)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_CUSTOMERS, error: null });

    await fetchAnalyticsCustomers({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_customers", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: null,
      p_kode: null,
    });
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      leaderboard: {
        revenueTertinggi: [{ pelangganId: "p1", nama: "BUDI", value: 3000000 }],
        profitTertinggi: [{ pelangganId: "p1", nama: "BUDI", value: 700000 }],
        qtyTerbanyak: [{ pelangganId: "p1", nama: "BUDI", value: 15 }],
      },
      insight: {
        customerBaru: 2,
        repeatCustomer: 5,
        avgOrder: 500000,
        ltv: 4000000,
        anonymousTransactionCount: 3,
        anonymousRevenue: 900000,
      },
      ranking: [{ pelangganId: "p1", nama: "BUDI", revenue: 3000000, profit: 700000, qty: 15, jumlahTransaksi: 4 }],
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsCustomers({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong (bukan error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsCustomers({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_CUSTOMERS);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsCustomers({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_CUSTOMERS);
  });
});

describe("fetchAnalyticsAdvanced (Phase 6 + Phase 6 Extension)", () => {
  it("memanggil rpc('analytics_advanced') dengan p_from/p_to/p_location/p_kode/p_low_margin_threshold (default 0.1)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_ADVANCED, error: null });

    await fetchAnalyticsAdvanced({ fromDate: "2024-01-01", toDate: "2024-01-31", location: "cideng", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_advanced", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: "cideng",
      p_kode: "D-01",
      p_low_margin_threshold: 0.1,
    });
  });

  it("location/kode undefined dikirim sebagai null (bukan undefined)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_ADVANCED, error: null });

    await fetchAnalyticsAdvanced({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_advanced", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: null,
      p_kode: null,
      p_low_margin_threshold: 0.1,
    });
  });

  it("meneruskan lowMarginThreshold custom apa adanya (Phase 6 Extension)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_ADVANCED, error: null });

    await fetchAnalyticsAdvanced({ fromDate: "2024-01-01", toDate: "2024-01-31", lowMarginThreshold: 0.15 });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "analytics_advanced",
      expect.objectContaining({ p_low_margin_threshold: 0.15 }),
    );
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      kpi: { returnRate: 0.05, returnRevenueImpact: 150000, overallMarginPct: 0.32, avgBasketSize: 2.4, avgItemPerTransaksi: 1.8 },
      growth: {
        topGrowth: [{ kode: "D-01-OSK", currentRevenue: 3000000, previousRevenue: 1000000, growthPct: 200 }],
        topDeclining: [{ kode: "D-02-SFN", currentRevenue: 200000, previousRevenue: 1000000, growthPct: -80 }],
      },
      contribution: {
        revenueByProduct: [{ kode: "D-01-OSK", value: 3000000, pct: 40.5 }],
        profitByProduct: [{ kode: "D-01-OSK", value: 700000, pct: 38.2 }],
      },
      productMix: [{ bahan: "OSK", value: 3000000, pct: 40.5 }],
      pareto: {
        items: [{ kode: "D-01-OSK", value: 3000000, cumulativePct: 40.5 }],
        productsFor80Pct: 5,
        totalProducts: 12,
      },
      newVsReturning: {
        newRevenue: 1000000,
        returningRevenue: 2000000,
        anonymousRevenue: 300000,
        newCustomerCount: 3,
        returningCustomerCount: 7,
      },
      weekdayPerformance: [{ dow: 1, label: "Senin", revenue: 500000, profit: 100000, qty: 5, transaksi: 3 }],
      hourlyPerformance: [{ hour: 9, revenue: 200000, profit: 40000, qty: 2, transaksi: 1 }],
      periodComparison: {
        mom: { currentRevenue: 5000000, previousRevenue: 4000000, pctChange: 25 },
        yoy: null,
        wow: { currentRevenue: 1200000, previousRevenue: 1000000, pctChange: 20 },
      },
      abcClassification: {
        thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
        a: { count: 3, revenuePct: 78.5 },
        b: { count: 5, revenuePct: 15.2 },
        c: { count: 10, revenuePct: 6.3 },
      },
      revenueConcentration: { top5Pct: 62.1, top10Pct: 81.4 },
      customerConcentration: { top5Pct: 40.2, top5CustomerCount: 5, totalIdentifiedCustomers: 30 },
      marketConcentration: [{ location: "gudang", value: 3000000, pct: 55.5 }],
      marginRisk: {
        lowMarginThresholdPct: 10,
        negativeMarginProducts: [{ kode: "D-09-XYZ", revenue: 200000, marginPct: -5.2 }],
        lowMarginProducts: [{ kode: "D-10-ABC", revenue: 300000, marginPct: 4.1 }],
      },
      salesDistribution: {
        weekday: { revenue: 4000000, profit: 800000, qty: 40, transaksi: 20 },
        weekend: { revenue: 1000000, profit: 200000, qty: 10, transaksi: 5 },
      },
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsAdvanced({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
    expect(result.periodComparison.wow.pctChange).toBe(20);
    expect(result.abcClassification.a.count).toBe(3);
    expect(result.marginRisk.negativeMarginProducts).toHaveLength(1);
  });

  it("data null -> fallback ke struktur kosong (bukan error), termasuk field Phase 6 Extension", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsAdvanced({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_ADVANCED);
    expect(result.periodComparison.wow).toBeNull();
    expect(result.marginRisk.negativeMarginProducts).toEqual([]);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsAdvanced({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_ADVANCED);
  });
});

describe("fetchAnalyticsInventory (Phase 7)", () => {
  it("memanggil rpc('analytics_inventory') dengan seluruh parameter (threshold default kalau tidak diisi)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_INVENTORY, error: null });

    await fetchAnalyticsInventory({ fromDate: "2024-01-01", toDate: "2024-01-31", location: "cideng", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_inventory", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: "cideng",
      p_kode: "D-01",
      p_low_stock_cover_days: 7,
      p_critical_cover_days: 3,
      p_overstock_cover_days: 60,
      p_dead_stock_days: 30,
      p_restock_target_days: 30,
    });
  });

  it("meneruskan threshold custom apa adanya", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_INVENTORY, error: null });

    await fetchAnalyticsInventory({
      fromDate: "2024-01-01",
      toDate: "2024-01-31",
      lowStockCoverDays: 10,
      criticalCoverDays: 5,
      overstockCoverDays: 90,
      deadStockDays: 45,
      restockTargetDays: 14,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_inventory", {
      p_from: "2024-01-01",
      p_to: "2024-01-31",
      p_location: null,
      p_kode: null,
      p_low_stock_cover_days: 10,
      p_critical_cover_days: 5,
      p_overstock_cover_days: 90,
      p_dead_stock_days: 45,
      p_restock_target_days: 14,
    });
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      summary: { totalInventoryValue: 50000000, totalSkuWithStock: 42, avgDailyCogs: 500000, daysOfInventory: 100, inventoryTurnover: 0.3, method: "days_of_inventory_from_current_stock_and_period_cogs" },
      stockHealth: { dead: 3, critical: 2, low: 5, healthy: 30, overstock: 2, noMovementPeriod: 1 },
      deadStock: [{ kode: "D-01-OSK", value: 45 }],
      agingStock: [{ kode: "D-02-SFN", value: 20 }],
      overstock: [{ kode: "D-03-MKN", value: 90.5 }],
      understock: [{ kode: "D-04-CTN", value: 2.1 }],
      suggestedRestock: [{ kode: "D-04-CTN", value: 15 }],
      restockPriority: [{ kode: "D-04-CTN", value: 250000 }],
      stockRiskIndicator: [{ kode: "D-01-OSK", value: null, category: "dead" }],
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsInventory({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong (bukan error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsInventory({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_INVENTORY);
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsInventory({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_INVENTORY);
  });
});

describe("fetchAnalyticsForecast (Phase 8)", () => {
  it("memanggil rpc('analytics_forecast') dengan seluruh parameter (default kalau tidak diisi)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_FORECAST, error: null });

    await fetchAnalyticsForecast({ fromDate: "2024-01-01", toDate: "2024-03-31", location: "cideng", kode: "D-01" });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_forecast", {
      p_from: "2024-01-01",
      p_to: "2024-03-31",
      p_location: "cideng",
      p_kode: "D-01",
      p_granularity: "week",
      p_alpha: 0.3,
      p_lookback_periods: 8,
      p_restock_horizon_periods: 2,
    });
  });

  it("meneruskan granularity/alpha/lookbackPeriods/restockHorizonPeriods custom apa adanya", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_FORECAST, error: null });

    await fetchAnalyticsForecast({
      fromDate: "2024-01-01",
      toDate: "2024-03-31",
      granularity: "month",
      alpha: 0.5,
      lookbackPeriods: 12,
      restockHorizonPeriods: 3,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("analytics_forecast", {
      p_from: "2024-01-01",
      p_to: "2024-03-31",
      p_location: null,
      p_kode: null,
      p_granularity: "month",
      p_alpha: 0.5,
      p_lookback_periods: 12,
      p_restock_horizon_periods: 3,
    });
  });

  it("location/kode undefined dikirim sebagai null (bukan undefined)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: EMPTY_FORECAST, error: null });

    await fetchAnalyticsForecast({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "analytics_forecast",
      expect.objectContaining({ p_location: null, p_kode: null }),
    );
  });

  it("meneruskan hasil RPC apa adanya tanpa transformasi", async () => {
    const rpcResult = {
      meta: { granularity: "week", historyBucketCount: 8, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: "2024-04-01" },
      revenueForecast: {
        history: [{ periode: "2024-03-25", value: 3000000 }],
        ma: 2800000,
        wma: 2900000,
        es: 2950000,
      },
      profitForecast: { history: [{ periode: "2024-03-25", value: 700000 }], ma: 650000, wma: 670000, es: 680000 },
      salesForecast: { history: [{ periode: "2024-03-25", value: 15 }], ma: 14, wma: 14.5, es: 14.8 },
      customerForecast: { history: [{ periode: "2024-03-25", value: 5 }], ma: 4, wma: 4.2, es: 4.5 },
      productDemandForecast: [
        { kode: "D-01-OSK", nama: "Gamis A", history: [{ periode: "2024-03-25", value: 10 }], ma: 9, wma: 9.5, es: 9.8 },
        { kode: "D-02-SFN", nama: "Gamis B", history: [], ma: null, wma: null, es: null },
      ],
      restockForecast: [
        { kode: "D-01-OSK", forecastedDemandNextPeriod: 10, currentStock: 5, suggestedOrderQty: 15 },
      ],
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchAnalyticsForecast({ fromDate: "2024-01-01", toDate: "2024-03-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null -> fallback ke struktur kosong dengan ma/wma/es null (bukan 0)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchAnalyticsForecast({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(EMPTY_FORECAST);
    expect(result.revenueForecast.ma).toBeNull();
    expect(result.revenueForecast.wma).toBeNull();
    expect(result.revenueForecast.es).toBeNull();
  });

  it("RPC error -> tetap fallback ke struktur kosong TANPA melempar", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchAnalyticsForecast({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual(EMPTY_FORECAST);
  });
});
