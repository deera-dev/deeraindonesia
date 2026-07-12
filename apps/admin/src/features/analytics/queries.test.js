import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchAnalyticsOverview: vi.fn(),
  fetchAnalyticsTrend: vi.fn(),
  fetchAnalyticsProducts: vi.fn(),
  fetchAnalyticsMarkets: vi.fn(),
  fetchAnalyticsMarketDetail: vi.fn(),
  fetchAnalyticsCustomers: vi.fn(),
  fetchAnalyticsAdvanced: vi.fn(),
  fetchAnalyticsInventory: vi.fn(),
  fetchAnalyticsForecast: vi.fn(),
}));

import {
  useAnalyticsMarketsQuery,
  useAnalyticsMarketDetailQuery,
  useAnalyticsCustomersQuery,
  useAnalyticsAdvancedQuery,
  useAnalyticsInventoryQuery,
  useAnalyticsForecastQuery,
} from "./queries";
import {
  fetchAnalyticsMarkets,
  fetchAnalyticsMarketDetail,
  fetchAnalyticsCustomers,
  fetchAnalyticsAdvanced,
  fetchAnalyticsInventory,
  fetchAnalyticsForecast,
} from "./api";

const wrapper = createWrapper();

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
  periodComparison: { mom: null, yoy: null },
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

beforeEach(() => {
  vi.clearAllMocks();
  fetchAnalyticsMarkets.mockResolvedValue({ markets: [] });
  fetchAnalyticsMarketDetail.mockResolvedValue(EMPTY_MARKET_DETAIL);
  fetchAnalyticsCustomers.mockResolvedValue(EMPTY_CUSTOMERS);
  fetchAnalyticsAdvanced.mockResolvedValue(EMPTY_ADVANCED);
  fetchAnalyticsInventory.mockResolvedValue(EMPTY_INVENTORY);
  fetchAnalyticsForecast.mockResolvedValue(EMPTY_FORECAST);
});

describe("useAnalyticsMarketsQuery", () => {
  it("memanggil fetchAnalyticsMarkets dengan fromDate/toDate/kode (TANPA location)", async () => {
    renderHook(
      () => useAnalyticsMarketsQuery({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: "D-01" }),
      { wrapper },
    );
    await waitFor(() => expect(fetchAnalyticsMarkets).toHaveBeenCalled());
    expect(fetchAnalyticsMarkets).toHaveBeenCalledWith({ fromDate: "2024-01-01", toDate: "2024-01-31", kode: "D-01" });
  });

  it("tidak query kalau fromDate/toDate belum ada", () => {
    renderHook(
      () => useAnalyticsMarketsQuery({ fromDate: null, toDate: null, kode: null }),
      { wrapper },
    );
    expect(fetchAnalyticsMarkets).not.toHaveBeenCalled();
  });
});

describe("useAnalyticsMarketDetailQuery — LAZY LOADING (§PERFORMANCE)", () => {
  it("TIDAK memanggil fetchAnalyticsMarketDetail selama market masih null (belum di-expand user)", async () => {
    renderHook(
      () => useAnalyticsMarketDetailQuery({ market: null, fromDate: "2024-01-01", toDate: "2024-01-31", kode: null }),
      { wrapper },
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchAnalyticsMarketDetail).not.toHaveBeenCalled();
  });

  it("TIDAK memanggil fetchAnalyticsMarketDetail selama market undefined", async () => {
    renderHook(
      () => useAnalyticsMarketDetailQuery({ market: undefined, fromDate: "2024-01-01", toDate: "2024-01-31", kode: null }),
      { wrapper },
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchAnalyticsMarketDetail).not.toHaveBeenCalled();
  });

  it("memanggil fetchAnalyticsMarketDetail SETELAH market diisi (user memilih/expand 1 market)", async () => {
    renderHook(
      () => useAnalyticsMarketDetailQuery({ market: "cideng", fromDate: "2024-01-01", toDate: "2024-01-31", kode: null }),
      { wrapper },
    );
    await waitFor(() => expect(fetchAnalyticsMarketDetail).toHaveBeenCalled());
    expect(fetchAnalyticsMarketDetail).toHaveBeenCalledWith({
      market: "cideng",
      fromDate: "2024-01-01",
      toDate: "2024-01-31",
      kode: null,
    });
  });

  it("query menjadi aktif begitu market berubah dari null -> string (simulasi klik 'Lihat Detail')", async () => {
    const { rerender } = renderHook(
      ({ market }) => useAnalyticsMarketDetailQuery({ market, fromDate: "2024-01-01", toDate: "2024-01-31", kode: null }),
      { wrapper, initialProps: { market: null } },
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchAnalyticsMarketDetail).not.toHaveBeenCalled();

    rerender({ market: "gudang" });
    await waitFor(() => expect(fetchAnalyticsMarketDetail).toHaveBeenCalled());
    expect(fetchAnalyticsMarketDetail).toHaveBeenCalledWith(expect.objectContaining({ market: "gudang" }));
  });

  it("tidak query kalau market diisi tapi fromDate/toDate belum ada", () => {
    renderHook(
      () => useAnalyticsMarketDetailQuery({ market: "cideng", fromDate: null, toDate: null, kode: null }),
      { wrapper },
    );
    expect(fetchAnalyticsMarketDetail).not.toHaveBeenCalled();
  });
});


describe("useAnalyticsCustomersQuery", () => {
  it("memanggil fetchAnalyticsCustomers dengan fromDate/toDate/location/kode", async () => {
    renderHook(
      () => useAnalyticsCustomersQuery({ fromDate: "2024-01-01", toDate: "2024-01-31", location: "cideng", kode: "D-01" }),
      { wrapper },
    );
    await waitFor(() => expect(fetchAnalyticsCustomers).toHaveBeenCalled());
    expect(fetchAnalyticsCustomers).toHaveBeenCalledWith({
      fromDate: "2024-01-01",
      toDate: "2024-01-31",
      location: "cideng",
      kode: "D-01",
    });
  });

  it("tidak query kalau fromDate/toDate belum ada", () => {
    renderHook(
      () => useAnalyticsCustomersQuery({ fromDate: null, toDate: null, location: null, kode: null }),
      { wrapper },
    );
    expect(fetchAnalyticsCustomers).not.toHaveBeenCalled();
  });
});

describe("useAnalyticsAdvancedQuery (Phase 6)", () => {
  it("memanggil fetchAnalyticsAdvanced dengan fromDate/toDate/location/kode", async () => {
    renderHook(
      () => useAnalyticsAdvancedQuery({ fromDate: "2024-01-01", toDate: "2024-01-31", location: "cideng", kode: "D-01" }),
      { wrapper },
    );
    await waitFor(() => expect(fetchAnalyticsAdvanced).toHaveBeenCalled());
    expect(fetchAnalyticsAdvanced).toHaveBeenCalledWith({
      fromDate: "2024-01-01",
      toDate: "2024-01-31",
      location: "cideng",
      kode: "D-01",
    });
  });

  it("tidak query kalau fromDate/toDate belum ada", () => {
    renderHook(
      () => useAnalyticsAdvancedQuery({ fromDate: null, toDate: null, location: null, kode: null }),
      { wrapper },
    );
    expect(fetchAnalyticsAdvanced).not.toHaveBeenCalled();
  });
});

describe("useAnalyticsInventoryQuery (Phase 7)", () => {
  it("memanggil fetchAnalyticsInventory dengan fromDate/toDate/location/kode + threshold", async () => {
    renderHook(
      () =>
        useAnalyticsInventoryQuery({
          fromDate: "2024-01-01",
          toDate: "2024-01-31",
          location: "cideng",
          kode: "D-01",
          lowStockCoverDays: 7,
          criticalCoverDays: 3,
          overstockCoverDays: 60,
          deadStockDays: 30,
          restockTargetDays: 30,
        }),
      { wrapper },
    );
    await waitFor(() => expect(fetchAnalyticsInventory).toHaveBeenCalled());
    expect(fetchAnalyticsInventory).toHaveBeenCalledWith({
      fromDate: "2024-01-01",
      toDate: "2024-01-31",
      location: "cideng",
      kode: "D-01",
      lowStockCoverDays: 7,
      criticalCoverDays: 3,
      overstockCoverDays: 60,
      deadStockDays: 30,
      restockTargetDays: 30,
    });
  });

  it("tidak query kalau fromDate/toDate belum ada", () => {
    renderHook(
      () => useAnalyticsInventoryQuery({ fromDate: null, toDate: null, location: null, kode: null }),
      { wrapper },
    );
    expect(fetchAnalyticsInventory).not.toHaveBeenCalled();
  });
});

describe("useAnalyticsForecastQuery (Phase 8)", () => {
  it("memanggil fetchAnalyticsForecast dengan fromDate/toDate/location/kode + granularity/alpha/lookbackPeriods/restockHorizonPeriods", async () => {
    renderHook(
      () =>
        useAnalyticsForecastQuery({
          fromDate: "2024-01-01",
          toDate: "2024-03-31",
          location: "cideng",
          kode: "D-01",
          granularity: "week",
          alpha: 0.3,
          lookbackPeriods: 8,
          restockHorizonPeriods: 2,
        }),
      { wrapper },
    );
    await waitFor(() => expect(fetchAnalyticsForecast).toHaveBeenCalled());
    expect(fetchAnalyticsForecast).toHaveBeenCalledWith({
      fromDate: "2024-01-01",
      toDate: "2024-03-31",
      location: "cideng",
      kode: "D-01",
      granularity: "week",
      alpha: 0.3,
      lookbackPeriods: 8,
      restockHorizonPeriods: 2,
    });
  });

  it("tidak query kalau fromDate/toDate belum ada", () => {
    renderHook(
      () =>
        useAnalyticsForecastQuery({
          fromDate: null,
          toDate: null,
          location: null,
          kode: null,
          granularity: "week",
          alpha: 0.3,
          lookbackPeriods: 8,
          restockHorizonPeriods: 2,
        }),
      { wrapper },
    );
    expect(fetchAnalyticsForecast).not.toHaveBeenCalled();
  });
});
