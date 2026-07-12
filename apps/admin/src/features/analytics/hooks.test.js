import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useAnalyticsOverviewQuery: vi.fn(),
  useAnalyticsTrendQuery: vi.fn(),
  useAnalyticsProductsQuery: vi.fn(),
  useAnalyticsMarketsQuery: vi.fn(),
  useAnalyticsMarketDetailQuery: vi.fn(),
  useAnalyticsCustomersQuery: vi.fn(),
  useAnalyticsAdvancedQuery: vi.fn(),
  useAnalyticsInventoryQuery: vi.fn(),
  useAnalyticsForecastQuery: vi.fn(),
}));

import {
  useAnalyticsFilter,
  useAnalyticsOverview,
  useAnalyticsTrend,
  useAnalyticsProducts,
  useAnalyticsMarkets,
  useAnalyticsMarketDetail,
  useAnalyticsCustomers,
  useAnalyticsAdvanced,
  useAnalyticsInventory,
  useAnalyticsForecast,
  useAnalyticsExecutive,
} from "./hooks";
import {
  useAnalyticsOverviewQuery,
  useAnalyticsTrendQuery,
  useAnalyticsProductsQuery,
  useAnalyticsMarketsQuery,
  useAnalyticsMarketDetailQuery,
  useAnalyticsCustomersQuery,
  useAnalyticsAdvancedQuery,
  useAnalyticsInventoryQuery,
  useAnalyticsForecastQuery,
} from "./queries";
import { useAnalyticsFilterStore } from "./store";
import { defaultDateRange } from "./utils";
import {
  LOW_STOCK_COVER_DAYS,
  FORECAST_GRANULARITY_DEFAULT,
  FORECAST_ALPHA_DEFAULT,
  FORECAST_LOOKBACK_PERIODS_DEFAULT,
  FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT,
} from "./constants";

const wrapper = createWrapper();
const DEFAULT_RANGE = defaultDateRange();

const EMPTY_PRODUCTS_SHAPE = {
  leaderboard: { terlaris: [], omsetTertinggi: [], profitTertinggi: [], marginTertinggi: [], marginTerendah: [] },
  harga: { hppTertinggi: [], hppTerendah: [], hargaJualTertinggi: [], hargaJualTerendah: [] },
  movement: { fastMoving: [], slowMoving: [] },
  inventory: { stokTerbanyak: [], stokHampirHabis: [], tidakPernahTerjual: [], tidakAdaPenjualanPeriode: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsFilterStore.setState({
    filter: { ...DEFAULT_RANGE, location: null, kode: null },
    granularity: "day",
    datePreset: "30d",
  });
  useAnalyticsOverviewQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsTrendQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsProductsQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsMarketsQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsMarketDetailQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsCustomersQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsAdvancedQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsInventoryQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useAnalyticsForecastQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
});

describe("useAnalyticsFilter", () => {
  it("meneruskan filter & granularity dari store apa adanya", () => {
    const { result } = renderHook(() => useAnalyticsFilter(), { wrapper });
    expect(result.current.filter.location).toBeNull();
    expect(result.current.filter.kode).toBeNull();
    expect(result.current.granularity).toBe("day");
  });

  it("setLocation dari hook mengubah state store", () => {
    const { result } = renderHook(() => useAnalyticsFilter(), { wrapper });
    result.current.setLocation("gudang");
    expect(useAnalyticsFilterStore.getState().filter.location).toBe("gudang");
  });

  it("meneruskan datePreset dari store apa adanya (requirement change 2026-07)", () => {
    const { result } = renderHook(() => useAnalyticsFilter(), { wrapper });
    expect(result.current.datePreset).toBe("30d");
  });

  it("setDatePreset dari hook mengubah state store", () => {
    const { result } = renderHook(() => useAnalyticsFilter(), { wrapper });
    result.current.setDatePreset("7d");
    expect(useAnalyticsFilterStore.getState().datePreset).toBe("7d");
  });
});

describe("useAnalyticsOverview", () => {
  it("data undefined (belum termuat) -> fallback ke struktur kosong, loading dari query", () => {
    useAnalyticsOverviewQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });
    expect(result.current.kpi).toEqual({
      totalRevenue: 0, totalProfit: 0, totalQty: 0, totalTransaksi: 0, totalCustomer: 0, aov: 0,
    });
    expect(result.current.quickInsight).toEqual({
      produkTerlaris: null, produkProfitTertinggi: null, pasarTerbaik: null, customerTerbaik: null,
    });
    expect(result.current.marketSummary).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
      kpi: { totalRevenue: 5000000, totalProfit: 1000000, totalQty: 20, totalTransaksi: 8, totalCustomer: 5, aov: 625000 },
      quickInsight: {
        produkTerlaris: { kode: "D-01", nama: "Gamis A", value: 20 },
        produkProfitTertinggi: { kode: "D-01", nama: "Gamis A", value: 1000000 },
        pasarTerbaik: { location: "cideng", value: 700000 },
        customerTerbaik: { pelangganId: "p1", nama: "BUDI", value: 2000000 },
      },
      marketSummary: [{ location: "cideng", revenue: 3000000, profit: 700000, qty: 12 }],
      trend: { granularity: "day", buckets: [{ periode: "2024-01-01", revenue: 100000, profit: 20000, qty: 2 }], topProductTrend: [], marketTrend: [] },
    };
    useAnalyticsOverviewQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });
    expect(result.current.kpi).toEqual(data.kpi);
    expect(result.current.quickInsight).toEqual(data.quickInsight);
    expect(result.current.marketSummary).toEqual(data.marketSummary);
    expect(result.current.loading).toBe(false);
  });

  it("TIDAK mengekspos `trend` (requirement change 2026-07 — Overview sudah tidak render chart, lihat useAnalyticsTrend untuk Trends tab)", () => {
    const data = {
      kpi: { totalRevenue: 5000000, totalProfit: 1000000, totalQty: 20, totalTransaksi: 8, totalCustomer: 5, aov: 625000 },
      quickInsight: {
        produkTerlaris: { kode: "D-01", nama: "Gamis A", value: 20 },
        produkProfitTertinggi: { kode: "D-01", nama: "Gamis A", value: 1000000 },
        pasarTerbaik: { location: "cideng", value: 700000 },
        customerTerbaik: { pelangganId: "p1", nama: "BUDI", value: 2000000 },
      },
      marketSummary: [{ location: "cideng", revenue: 3000000, profit: 700000, qty: 12 }],
      // RPC analytics_overview MASIH mengembalikan `trend` (backward-compat,
      // tidak diubah) — tapi hook WAJIB tidak meneruskannya lagi.
      trend: { granularity: "day", buckets: [{ periode: "2024-01-01", revenue: 100000, profit: 20000, qty: 2 }], topProductTrend: [], marketTrend: [] },
    };
    useAnalyticsOverviewQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });
    expect(result.current.trend).toBeUndefined();
  });
});

describe("useAnalyticsTrend", () => {
  it("data undefined -> fallback ke array kosong, granularity dari store", () => {
    useAnalyticsTrendQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsTrend(), { wrapper });
    expect(result.current.buckets).toEqual([]);
    expect(result.current.topProductTrend).toEqual([]);
    expect(result.current.marketTrend).toEqual([]);
    expect(result.current.granularity).toBe("day");
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
      granularity: "week",
      buckets: [{ periode: "2024-01-01", revenue: 500000, profit: 100000, qty: 5 }],
      topProductTrend: [{ kode: "D-01", nama: "Gamis A", points: [{ periode: "2024-01-01", qty: 5 }] }],
      marketTrend: [{ location: "cideng", points: [{ periode: "2024-01-01", revenue: 500000 }] }],
    };
    useAnalyticsTrendQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsTrend(), { wrapper });
    expect(result.current.buckets).toEqual(data.buckets);
    expect(result.current.topProductTrend).toEqual(data.topProductTrend);
    expect(result.current.marketTrend).toEqual(data.marketTrend);
    expect(result.current.granularity).toBe("week");
  });
});

describe("useAnalyticsProducts", () => {
  it("data undefined (belum termuat) -> fallback ke struktur kosong, loading dari query", () => {
    useAnalyticsProductsQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsProducts(), { wrapper });
    expect(result.current.leaderboard).toEqual(EMPTY_PRODUCTS_SHAPE.leaderboard);
    expect(result.current.harga).toEqual(EMPTY_PRODUCTS_SHAPE.harga);
    expect(result.current.movement).toEqual(EMPTY_PRODUCTS_SHAPE.movement);
    expect(result.current.inventory).toEqual(EMPTY_PRODUCTS_SHAPE.inventory);
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
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
    useAnalyticsProductsQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsProducts(), { wrapper });
    expect(result.current.leaderboard).toEqual(data.leaderboard);
    expect(result.current.harga).toEqual(data.harga);
    expect(result.current.movement).toEqual(data.movement);
    expect(result.current.inventory).toEqual(data.inventory);
    expect(result.current.loading).toBe(false);
  });

  it("mengirim LOW_STOCK_COVER_DAYS sebagai lowStockCoverDays ke useAnalyticsProductsQuery", () => {
    renderHook(() => useAnalyticsProducts(), { wrapper });
    expect(useAnalyticsProductsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ lowStockCoverDays: LOW_STOCK_COVER_DAYS }),
    );
  });
});


describe("useAnalyticsMarkets", () => {
  it("data undefined (belum termuat) -> fallback ke array kosong, loading dari query", () => {
    useAnalyticsMarketsQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsMarkets(), { wrapper });
    expect(result.current.markets).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
      markets: [
        { location: "cideng", revenue: 3000000, profit: 700000, qty: 15, customer: 5 },
        { location: "gudang", revenue: 2000000, profit: 500000, qty: 10, customer: 3 },
        { location: "tegalgubug", revenue: 0, profit: 0, qty: 0, customer: 0 },
      ],
    };
    useAnalyticsMarketsQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsMarkets(), { wrapper });
    expect(result.current.markets).toEqual(data.markets);
    expect(result.current.loading).toBe(false);
  });

  it("mengirim fromDate/toDate/kode ke useAnalyticsMarketsQuery TANPA location", () => {
    renderHook(() => useAnalyticsMarkets(), { wrapper });
    const callArg = useAnalyticsMarketsQuery.mock.calls[0][0];
    expect(callArg).toEqual({
      fromDate: DEFAULT_RANGE.fromDate,
      toDate: DEFAULT_RANGE.toDate,
      kode: null,
    });
    expect(callArg).not.toHaveProperty("location");
  });

  it("filter.location yang aktif TETAP TIDAK diteruskan ke useAnalyticsMarketsQuery", () => {
    useAnalyticsFilterStore.setState({
      filter: { ...DEFAULT_RANGE, location: "cideng", kode: null },
      granularity: "day",
    });
    renderHook(() => useAnalyticsMarkets(), { wrapper });
    const callArg = useAnalyticsMarketsQuery.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("location");
  });
});

describe("useAnalyticsMarketDetail", () => {
  it("data undefined -> fallback ke struktur kosong, loading dari query", () => {
    useAnalyticsMarketDetailQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsMarketDetail("cideng"), { wrapper });
    expect(result.current.revenue).toBe(0);
    expect(result.current.profit).toBe(0);
    expect(result.current.qty).toBe(0);
    expect(result.current.customer).toBe(0);
    expect(result.current.produkTerlaris).toEqual([]);
    expect(result.current.trend).toEqual({ granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] });
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
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
    useAnalyticsMarketDetailQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsMarketDetail("cideng"), { wrapper });
    expect(result.current.revenue).toBe(data.revenue);
    expect(result.current.profit).toBe(data.profit);
    expect(result.current.produkTerlaris).toEqual(data.produkTerlaris);
    expect(result.current.trend).toEqual(data.trend);
  });

  it("meneruskan `market` yang diberikan ke useAnalyticsMarketDetailQuery apa adanya (termasuk null)", () => {
    renderHook(() => useAnalyticsMarketDetail(null), { wrapper });
    expect(useAnalyticsMarketDetailQuery).toHaveBeenCalledWith(
      expect.objectContaining({ market: null }),
    );
  });

  it("meneruskan market string yang aktif ke useAnalyticsMarketDetailQuery", () => {
    renderHook(() => useAnalyticsMarketDetail("gudang"), { wrapper });
    expect(useAnalyticsMarketDetailQuery).toHaveBeenCalledWith(
      expect.objectContaining({ market: "gudang" }),
    );
  });
});


describe("useAnalyticsCustomers", () => {
  it("data undefined (belum termuat) -> fallback ke struktur kosong, loading dari query", () => {
    useAnalyticsCustomersQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsCustomers(), { wrapper });
    expect(result.current.leaderboard).toEqual({ revenueTertinggi: [], profitTertinggi: [], qtyTerbanyak: [] });
    expect(result.current.insight).toEqual({
      customerBaru: 0,
      repeatCustomer: 0,
      avgOrder: 0,
      ltv: 0,
      anonymousTransactionCount: 0,
      anonymousRevenue: 0,
    });
    expect(result.current.ranking).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
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
    useAnalyticsCustomersQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsCustomers(), { wrapper });
    expect(result.current.leaderboard).toEqual(data.leaderboard);
    expect(result.current.insight).toEqual(data.insight);
    expect(result.current.ranking).toEqual(data.ranking);
    expect(result.current.loading).toBe(false);
  });

  it("meneruskan filter (fromDate/toDate/location/kode) ke useAnalyticsCustomersQuery", () => {
    renderHook(() => useAnalyticsCustomers(), { wrapper });
    expect(useAnalyticsCustomersQuery).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: DEFAULT_RANGE.fromDate, toDate: DEFAULT_RANGE.toDate, location: null, kode: null }),
    );
  });
});

describe("useAnalyticsAdvanced (Phase 6 + Phase 6 Extension)", () => {
  it("data undefined (belum termuat) -> fallback ke struktur kosong, loading dari query", () => {
    useAnalyticsAdvancedQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsAdvanced(), { wrapper });
    expect(result.current.kpi).toEqual({
      returnRate: 0, returnRevenueImpact: 0, overallMarginPct: 0, avgBasketSize: 0, avgItemPerTransaksi: 0,
    });
    expect(result.current.growth).toEqual({ topGrowth: [], topDeclining: [] });
    expect(result.current.contribution).toEqual({ revenueByProduct: [], profitByProduct: [] });
    expect(result.current.productMix).toEqual([]);
    expect(result.current.pareto).toEqual({ items: [], productsFor80Pct: 0, totalProducts: 0 });
    expect(result.current.newVsReturning).toEqual({
      newRevenue: 0, returningRevenue: 0, anonymousRevenue: 0, newCustomerCount: 0, returningCustomerCount: 0,
    });
    expect(result.current.weekdayPerformance).toEqual([]);
    expect(result.current.hourlyPerformance).toEqual([]);
    expect(result.current.periodComparison).toEqual({ mom: null, yoy: null, wow: null });
    expect(result.current.abcClassification).toEqual({
      thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
      a: { count: 0, revenuePct: 0 }, b: { count: 0, revenuePct: 0 }, c: { count: 0, revenuePct: 0 },
    });
    expect(result.current.revenueConcentration).toEqual({ top5Pct: 0, top10Pct: 0 });
    expect(result.current.customerConcentration).toEqual({ top5Pct: 0, top5CustomerCount: 0, totalIdentifiedCustomers: 0 });
    expect(result.current.marketConcentration).toEqual([]);
    expect(result.current.marginRisk).toEqual({ lowMarginThresholdPct: 10, negativeMarginProducts: [], lowMarginProducts: [] });
    expect(result.current.salesDistribution).toEqual({
      weekday: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
      weekend: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
    });
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi, termasuk periodComparison.wow dan field Phase 6 Extension lain", () => {
    const data = {
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
      pareto: { items: [{ kode: "D-01-OSK", value: 3000000, cumulativePct: 40.5 }], productsFor80Pct: 5, totalProducts: 12 },
      newVsReturning: {
        newRevenue: 1000000, returningRevenue: 2000000, anonymousRevenue: 300000, newCustomerCount: 3, returningCustomerCount: 7,
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
        a: { count: 3, revenuePct: 78.5 }, b: { count: 5, revenuePct: 15.2 }, c: { count: 10, revenuePct: 6.3 },
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
    useAnalyticsAdvancedQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsAdvanced(), { wrapper });
    expect(result.current.kpi).toEqual(data.kpi);
    expect(result.current.growth).toEqual(data.growth);
    expect(result.current.contribution).toEqual(data.contribution);
    expect(result.current.productMix).toEqual(data.productMix);
    expect(result.current.pareto).toEqual(data.pareto);
    expect(result.current.newVsReturning).toEqual(data.newVsReturning);
    expect(result.current.weekdayPerformance).toEqual(data.weekdayPerformance);
    expect(result.current.hourlyPerformance).toEqual(data.hourlyPerformance);
    expect(result.current.periodComparison).toEqual(data.periodComparison);
    expect(result.current.periodComparison.yoy).toBeNull();
    expect(result.current.periodComparison.wow.pctChange).toBe(20);
    expect(result.current.abcClassification).toEqual(data.abcClassification);
    expect(result.current.revenueConcentration).toEqual(data.revenueConcentration);
    expect(result.current.customerConcentration).toEqual(data.customerConcentration);
    expect(result.current.marketConcentration).toEqual(data.marketConcentration);
    expect(result.current.marginRisk).toEqual(data.marginRisk);
    expect(result.current.salesDistribution).toEqual(data.salesDistribution);
    expect(result.current.loading).toBe(false);
  });

  it("meneruskan filter (fromDate/toDate/location/kode) ke useAnalyticsAdvancedQuery", () => {
    renderHook(() => useAnalyticsAdvanced(), { wrapper });
    expect(useAnalyticsAdvancedQuery).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: DEFAULT_RANGE.fromDate, toDate: DEFAULT_RANGE.toDate, location: null, kode: null }),
    );
  });
});

describe("useAnalyticsInventory (Phase 7)", () => {
  it("data undefined (belum termuat) -> fallback ke struktur kosong, loading dari query", () => {
    useAnalyticsInventoryQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsInventory(), { wrapper });
    expect(result.current.summary).toEqual({
      totalInventoryValue: 0, totalSkuWithStock: 0, avgDailyCogs: 0, daysOfInventory: 0, inventoryTurnover: 0,
      method: "days_of_inventory_from_current_stock_and_period_cogs",
    });
    expect(result.current.stockHealth).toEqual({ dead: 0, critical: 0, low: 0, healthy: 0, overstock: 0, noMovementPeriod: 0 });
    expect(result.current.deadStock).toEqual([]);
    expect(result.current.agingStock).toEqual([]);
    expect(result.current.overstock).toEqual([]);
    expect(result.current.understock).toEqual([]);
    expect(result.current.suggestedRestock).toEqual([]);
    expect(result.current.restockPriority).toEqual([]);
    expect(result.current.stockRiskIndicator).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi", () => {
    const data = {
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
    useAnalyticsInventoryQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsInventory(), { wrapper });
    expect(result.current.summary).toEqual(data.summary);
    expect(result.current.stockHealth).toEqual(data.stockHealth);
    expect(result.current.deadStock).toEqual(data.deadStock);
    expect(result.current.agingStock).toEqual(data.agingStock);
    expect(result.current.overstock).toEqual(data.overstock);
    expect(result.current.understock).toEqual(data.understock);
    expect(result.current.suggestedRestock).toEqual(data.suggestedRestock);
    expect(result.current.restockPriority).toEqual(data.restockPriority);
    expect(result.current.stockRiskIndicator).toEqual(data.stockRiskIndicator);
    expect(result.current.loading).toBe(false);
  });

  it("mengirim threshold constants (LOW_STOCK_COVER_DAYS dkk) ke useAnalyticsInventoryQuery", () => {
    renderHook(() => useAnalyticsInventory(), { wrapper });
    expect(useAnalyticsInventoryQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: DEFAULT_RANGE.fromDate,
        toDate: DEFAULT_RANGE.toDate,
        location: null,
        kode: null,
        lowStockCoverDays: 7,
        criticalCoverDays: 3,
        overstockCoverDays: 60,
        deadStockDays: 30,
        restockTargetDays: 30,
      }),
    );
  });
});

describe("useAnalyticsForecast (Phase 8)", () => {
  it("data undefined (belum termuat) -> fallback ke struktur kosong dengan ma/wma/es null, loading dari query", () => {
    useAnalyticsForecastQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAnalyticsForecast(), { wrapper });
    expect(result.current.meta).toEqual({
      granularity: FORECAST_GRANULARITY_DEFAULT,
      historyBucketCount: 0,
      alpha: FORECAST_ALPHA_DEFAULT,
      lookbackPeriods: FORECAST_LOOKBACK_PERIODS_DEFAULT,
      nextPeriodeLabel: null,
    });
    const emptySeries = { history: [], ma: null, wma: null, es: null };
    expect(result.current.revenueForecast).toEqual(emptySeries);
    expect(result.current.profitForecast).toEqual(emptySeries);
    expect(result.current.salesForecast).toEqual(emptySeries);
    expect(result.current.customerForecast).toEqual(emptySeries);
    expect(result.current.productDemandForecast).toEqual([]);
    expect(result.current.restockForecast).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("meneruskan data RPC apa adanya tanpa transformasi, termasuk ma/wma/es null APA ADANYA", () => {
    const data = {
      meta: { granularity: "week", historyBucketCount: 8, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: "2024-04-01" },
      revenueForecast: { history: [{ periode: "2024-03-25", value: 3000000 }], ma: 2800000, wma: 2900000, es: 2950000 },
      profitForecast: { history: [{ periode: "2024-03-25", value: 700000 }], ma: 650000, wma: 670000, es: 680000 },
      salesForecast: { history: [{ periode: "2024-03-25", value: 15 }], ma: 14, wma: 14.5, es: 14.8 },
      customerForecast: { history: [], ma: null, wma: null, es: null },
      productDemandForecast: [
        { kode: "D-01-OSK", nama: "Gamis A", history: [{ periode: "2024-03-25", value: 10 }], ma: 9, wma: 9.5, es: 9.8 },
      ],
      restockForecast: [{ kode: "D-01-OSK", forecastedDemandNextPeriod: 10, currentStock: 5, suggestedOrderQty: 15 }],
    };
    useAnalyticsForecastQuery.mockReturnValue({ data, isLoading: false, error: null });
    const { result } = renderHook(() => useAnalyticsForecast(), { wrapper });
    expect(result.current.meta).toEqual(data.meta);
    expect(result.current.revenueForecast).toEqual(data.revenueForecast);
    expect(result.current.profitForecast).toEqual(data.profitForecast);
    expect(result.current.salesForecast).toEqual(data.salesForecast);
    expect(result.current.customerForecast).toEqual(data.customerForecast);
    expect(result.current.customerForecast.ma).toBeNull();
    expect(result.current.productDemandForecast).toEqual(data.productDemandForecast);
    expect(result.current.restockForecast).toEqual(data.restockForecast);
    expect(result.current.loading).toBe(false);
  });

  it("mengirim filter + konstanta default (granularity/alpha/lookbackPeriods/restockHorizonPeriods) ke useAnalyticsForecastQuery", () => {
    renderHook(() => useAnalyticsForecast(), { wrapper });
    expect(useAnalyticsForecastQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: DEFAULT_RANGE.fromDate,
        toDate: DEFAULT_RANGE.toDate,
        location: null,
        kode: null,
        granularity: FORECAST_GRANULARITY_DEFAULT,
        alpha: FORECAST_ALPHA_DEFAULT,
        lookbackPeriods: FORECAST_LOOKBACK_PERIODS_DEFAULT,
        restockHorizonPeriods: FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT,
      }),
    );
  });
});

// ── Phase 5 (Dashboard Polish): refetch pass-through ──────────────────────
// Setiap hook publik WAJIB meneruskan `refetch` dari query TanStack Query
// apa adanya (dipakai ErrorState "Coba Lagi" button di setiap tab).
describe("refetch pass-through (Phase 5)", () => {
  it("useAnalyticsOverview meneruskan refetch dari useAnalyticsOverviewQuery", () => {
    const refetch = vi.fn();
    useAnalyticsOverviewQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsTrend meneruskan refetch dari useAnalyticsTrendQuery", () => {
    const refetch = vi.fn();
    useAnalyticsTrendQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsTrend(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsProducts meneruskan refetch dari useAnalyticsProductsQuery", () => {
    const refetch = vi.fn();
    useAnalyticsProductsQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsProducts(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsMarkets meneruskan refetch dari useAnalyticsMarketsQuery", () => {
    const refetch = vi.fn();
    useAnalyticsMarketsQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsMarkets(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsMarketDetail meneruskan refetch dari useAnalyticsMarketDetailQuery", () => {
    const refetch = vi.fn();
    useAnalyticsMarketDetailQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsMarketDetail("cideng"), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsCustomers meneruskan refetch dari useAnalyticsCustomersQuery", () => {
    const refetch = vi.fn();
    useAnalyticsCustomersQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsCustomers(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsAdvanced meneruskan refetch dari useAnalyticsAdvancedQuery (Phase 6)", () => {
    const refetch = vi.fn();
    useAnalyticsAdvancedQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsAdvanced(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsInventory meneruskan refetch dari useAnalyticsInventoryQuery (Phase 7)", () => {
    const refetch = vi.fn();
    useAnalyticsInventoryQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsInventory(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });

  it("useAnalyticsForecast meneruskan refetch dari useAnalyticsForecastQuery (Phase 8)", () => {
    const refetch = vi.fn();
    useAnalyticsForecastQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch });
    const { result } = renderHook(() => useAnalyticsForecast(), { wrapper });
    expect(result.current.refetch).toBe(refetch);
  });
});


// ── Phase 9 — Executive Dashboard: AGREGATOR MURNI dari 5 hook lain
// (Overview/Advanced/Customers/Inventory/Forecast), TIDAK ADA RPC baru.
// Test di sini memverifikasi PENGGABUNGAN, bukan business logic RPC —
// setiap query di-mock lewat ./queries (SAMA seperti describe block lain
// di file ini), buildBusinessHealth/buildBiggestOpportunity/dkk di utils.js
// TIDAK di-mock (sengaja) supaya integrasi hook -> utils murni ikut teruji.
describe("useAnalyticsExecutive (Phase 9)", () => {
  function mockAllQueries({ overview, advanced, customers, inventory, forecast } = {}) {
    useAnalyticsOverviewQuery.mockReturnValue({
      data: overview ?? {
        kpi: { totalRevenue: 5000000, totalProfit: 1200000, totalQty: 20, totalTransaksi: 8, totalCustomer: 5, aov: 625000 },
        quickInsight: {
          produkTerlaris: { kode: "D-01-OSK", nama: "Gamis A", value: 20 },
          produkProfitTertinggi: null,
          pasarTerbaik: { location: "cideng", value: 700000 },
          customerTerbaik: { pelangganId: "p1", nama: "BUDI", value: 2000000 },
        },
        marketSummary: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useAnalyticsAdvancedQuery.mockReturnValue({
      data: advanced ?? {
        kpi: { returnRate: 0.02, returnRevenueImpact: 50000, overallMarginPct: 0.24, avgBasketSize: 2, avgItemPerTransaksi: 1.5 },
        periodComparison: { mom: { currentRevenue: 5000000, previousRevenue: 4000000, pctChange: 25 }, yoy: null, wow: null },
        marginRisk: { lowMarginThresholdPct: 10, negativeMarginProducts: [{ kode: "D-09-XYZ", revenue: 200000, marginPct: -5.2 }], lowMarginProducts: [] },
        marketConcentration: [{ location: "gudang", value: 3000000, pct: 55.5 }],
        revenueConcentration: { top5Pct: 62.1, top10Pct: 81.4 },
        newVsReturning: { newRevenue: 1000000, returningRevenue: 2000000, anonymousRevenue: 0, newCustomerCount: 3, returningCustomerCount: 7 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useAnalyticsCustomersQuery.mockReturnValue({
      data: customers ?? { insight: { repeatCustomer: 5, customerBaru: 3, avgOrder: 500000, ltv: 4000000, anonymousTransactionCount: 0, anonymousRevenue: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useAnalyticsInventoryQuery.mockReturnValue({
      data: inventory ?? {
        summary: { totalInventoryValue: 20000000, totalSkuWithStock: 30, avgDailyCogs: 400000, daysOfInventory: 45, inventoryTurnover: 0.4, method: "days_of_inventory_from_current_stock_and_period_cogs" },
        stockHealth: { dead: 2, critical: 1, low: 3, healthy: 20, overstock: 1, noMovementPeriod: 0 },
        deadStock: [{ kode: "D-05-ABC", value: 30 }],
        suggestedRestock: [{ kode: "D-04-CTN", value: 15 }],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useAnalyticsForecastQuery.mockReturnValue({
      data: forecast ?? {
        meta: { granularity: "week", historyBucketCount: 8, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: "2024-04-01" },
        revenueForecast: { history: [{ periode: "2024-03-25", value: 3000000 }], ma: 2800000, wma: 2900000, es: 2950000 },
        profitForecast: { history: [{ periode: "2024-03-25", value: 700000 }], ma: 650000, wma: 670000, es: 680000 },
        salesForecast: { history: [{ periode: "2024-03-25", value: 15 }], ma: 14, wma: 14.5, es: 14.8 },
        restockForecast: [
          { kode: "D-01-OSK", forecastedDemandNextPeriod: 10, currentStock: 5, suggestedOrderQty: 15 },
          { kode: "D-02-SFN", forecastedDemandNextPeriod: 20, currentStock: 2, suggestedOrderQty: 25 },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  }

  it("loading true kalau SALAH SATU dari 5 hook underlying masih loading", () => {
    mockAllQueries();
    useAnalyticsForecastQuery.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it("error diteruskan kalau SALAH SATU dari 5 hook underlying error", () => {
    mockAllQueries();
    const err = new Error("gagal fetch inventory");
    useAnalyticsInventoryQuery.mockReturnValue({ data: undefined, isLoading: false, error: err, refetch: vi.fn() });
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.error).toBe(err);
  });

  it("refetch() memanggil refetch KELIMA hook underlying", () => {
    mockAllQueries();
    const overviewRefetch = vi.fn();
    const advancedRefetch = vi.fn();
    const customersRefetch = vi.fn();
    const inventoryRefetch = vi.fn();
    const forecastRefetch = vi.fn();
    useAnalyticsOverviewQuery.mockReturnValue({ ...useAnalyticsOverviewQuery(), isLoading: false, error: null, refetch: overviewRefetch });
    useAnalyticsAdvancedQuery.mockReturnValue({ ...useAnalyticsAdvancedQuery(), isLoading: false, error: null, refetch: advancedRefetch });
    useAnalyticsCustomersQuery.mockReturnValue({ ...useAnalyticsCustomersQuery(), isLoading: false, error: null, refetch: customersRefetch });
    useAnalyticsInventoryQuery.mockReturnValue({ ...useAnalyticsInventoryQuery(), isLoading: false, error: null, refetch: inventoryRefetch });
    useAnalyticsForecastQuery.mockReturnValue({ ...useAnalyticsForecastQuery(), isLoading: false, error: null, refetch: forecastRefetch });
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    result.current.refetch();
    expect(overviewRefetch).toHaveBeenCalledTimes(1);
    expect(advancedRefetch).toHaveBeenCalledTimes(1);
    expect(customersRefetch).toHaveBeenCalledTimes(1);
    expect(inventoryRefetch).toHaveBeenCalledTimes(1);
    expect(forecastRefetch).toHaveBeenCalledTimes(1);
  });

  it("kpi — SELURUH angka pass-through dari useAnalyticsOverview/useAnalyticsAdvanced/useAnalyticsCustomers, TIDAK dihitung ulang", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.kpi).toEqual({
      revenue: 5000000,
      profit: 1200000,
      marginPct: 0.24,
      growthMomPct: 25,
      customer: 5,
      transaksi: 8,
      repeatCustomer: 5,
    });
  });

  it("kpi.growthMomPct null kalau periodComparison.mom null (histori belum cukup)", () => {
    mockAllQueries({
      advanced: {
        kpi: { returnRate: 0, returnRevenueImpact: 0, overallMarginPct: 0.2, avgBasketSize: 1, avgItemPerTransaksi: 1 },
        periodComparison: { mom: null, yoy: null, wow: null },
        marginRisk: { lowMarginThresholdPct: 10, negativeMarginProducts: [], lowMarginProducts: [] },
        marketConcentration: [],
        revenueConcentration: { top5Pct: 0, top10Pct: 0 },
        newVsReturning: { newRevenue: 0, returningRevenue: 0, anonymousRevenue: 0, newCustomerCount: 0, returningCustomerCount: 0 },
      },
    });
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.kpi.growthMomPct).toBeNull();
  });

  it("businessHealth dibangun dari buildBusinessHealth() (utils.js) — status hijau untuk MoM naik", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    const revenueHealth = result.current.businessHealth.find((h) => h.label === "Penjualan (Bulan ke Bulan)");
    expect(revenueHealth.status).toBe("green");
  });

  it("bestProduct/bestCustomer/bestMarket — pass-through quickInsight dari useAnalyticsOverview", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.bestProduct).toEqual({ kode: "D-01-OSK", nama: "Gamis A", value: 20 });
    expect(result.current.bestCustomer).toEqual({ pelangganId: "p1", nama: "BUDI", value: 2000000 });
    expect(result.current.bestMarket).toEqual({ location: "cideng", value: 700000 });
  });

  it("biggestOpportunity — diurutkan DESC dari restockForecast berdasarkan suggestedOrderQty", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.biggestOpportunity[0].kode).toBe("D-02-SFN"); // suggestedOrderQty 25 > 15
    expect(result.current.biggestOpportunity[1].kode).toBe("D-01-OSK");
  });

  it("biggestRisk — gabungan deadStock (inventory) + negativeMarginProducts (advanced)", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    const categories = result.current.biggestRisk.map((r) => r.category);
    expect(categories).toContain("Stok Tidak Bergerak");
    expect(categories).toContain("Margin Negatif");
  });

  it("insights & recommendations — array non-kosong, dibangun dari data gabungan", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.insights.length).toBeGreaterThan(0);
    expect(result.current.recommendations.length).toBeGreaterThan(0);
    expect(result.current.recommendations.some((r) => r.includes("D-04-CTN"))).toBe(true);
  });

  it("forecastSummary — pass-through meta + revenue/profit/sales forecast (ES/MA/WMA), TANPA productDemand/customerForecast", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.forecastSummary.meta.nextPeriodeLabel).toBe("2024-04-01");
    expect(result.current.forecastSummary.revenue.es).toBe(2950000);
    expect(result.current.forecastSummary.profit.es).toBe(680000);
    expect(result.current.forecastSummary.sales.es).toBe(14.8);
  });

  it("inventorySummary — pass-through dari useAnalyticsInventory (stockHealth + summary)", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.inventorySummary).toEqual({
      deadStockCount: 2,
      criticalStockCount: 1,
      totalInventoryValue: 20000000,
      daysOfInventory: 45,
    });
  });

  it("quickActions — COUNT dari array yang sudah ada (suggestedRestock/negativeMarginProducts/deadStock), BUKAN hitungan baru", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.quickActions).toEqual({
      restockCount: 1,
      negativeMarginCount: 1,
      deadStockCount: 2,
    });
  });

  // ── Redesign UI/UX 2026-07 — Tindakan Prioritas (ADDITIVE, quickActions
  // di atas TETAP ada apa adanya) ──────────────────────────────────────────
  it("quickActionsPrioritized — mengelompokkan sinyal yang SUDAH ada ke Tinggi/Sedang/Rendah", () => {
    mockAllQueries();
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    // Default mockAllQueries(): suggestedRestock 1 item (D-04-CTN),
    // stockHealth.critical=1, negativeMarginProducts 1 item, stockHealth.low=3,
    // stockHealth.dead=2, salesForecast history [{value:15}] es=14.8 (turun),
    // periodComparison.mom.pctChange=25 (naik).
    const p = result.current.quickActionsPrioritized;
    expect(p.tinggi).toEqual([
      { label: "1 produk perlu segera ditambah stoknya.", detail: "Termasuk: D-04-CTN." },
      { label: "1 produk stoknya kritis, hampir habis.", detail: null },
      { label: "1 produk terjual di bawah harga modal (rugi).", detail: null },
    ]);
    expect(p.sedang).toEqual([
      { label: "3 produk stoknya mulai menipis.", detail: null },
      { label: "2 produk sudah lama tidak terjual sama sekali.", detail: null },
    ]);
    // salesForecast es=14.8 < histori terakhir 15 -> "turun", BUKAN "naik" ->
    // TIDAK memicu insight permintaan meningkat. mom.pctChange=25 (>0) TETAP
    // memicu insight revenue naik.
    expect(p.rendah).toEqual([{ label: "Penjualan naik 25% dibanding bulan sebelumnya.", detail: null }]);
  });

  it("quickActionsPrioritized — ketiga keranjang kosong kalau seluruh sinyal underlying kosong", () => {
    mockAllQueries({
      inventory: {
        summary: { totalInventoryValue: 0, totalSkuWithStock: 0, avgDailyCogs: 0, daysOfInventory: 0, inventoryTurnover: 0, method: "days_of_inventory_from_current_stock_and_period_cogs" },
        stockHealth: { dead: 0, critical: 0, low: 0, healthy: 0, overstock: 0, noMovementPeriod: 0 },
        deadStock: [],
        suggestedRestock: [],
      },
      advanced: {
        kpi: { returnRate: 0, returnRevenueImpact: 0, overallMarginPct: 0.2, avgBasketSize: 1, avgItemPerTransaksi: 1 },
        periodComparison: { mom: null, yoy: null, wow: null },
        marginRisk: { lowMarginThresholdPct: 10, negativeMarginProducts: [], lowMarginProducts: [] },
        marketConcentration: [],
        revenueConcentration: { top5Pct: 0, top10Pct: 0 },
        newVsReturning: { newRevenue: 0, returningRevenue: 0, anonymousRevenue: 0, newCustomerCount: 0, returningCustomerCount: 0 },
      },
      forecast: {
        meta: { granularity: "week", historyBucketCount: 0, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: null },
        revenueForecast: { history: [], ma: null, wma: null, es: null },
        profitForecast: { history: [], ma: null, wma: null, es: null },
        salesForecast: { history: [], ma: null, wma: null, es: null },
        restockForecast: [],
      },
    });
    const { result } = renderHook(() => useAnalyticsExecutive(), { wrapper });
    expect(result.current.quickActionsPrioritized).toEqual({ tinggi: [], sedang: [], rendah: [] });
  });
});
