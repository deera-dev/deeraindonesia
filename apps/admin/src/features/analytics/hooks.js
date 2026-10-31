import {
  CRITICAL_COVER_DAYS,
  DEAD_STOCK_DAYS,
  FORECAST_ALPHA_DEFAULT,
  FORECAST_GRANULARITY_DEFAULT,
  FORECAST_LOOKBACK_PERIODS_DEFAULT,
  FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT,
  LOW_STOCK_COVER_DAYS,
  OVERSTOCK_COVER_DAYS,
  RESTOCK_TARGET_DAYS,
} from "./constants";
import {
  useAnalyticsAdvancedQuery,
  useAnalyticsCustomersQuery,
  useAnalyticsForecastQuery,
  useAnalyticsInventoryQuery,
  useAnalyticsMarketDetailQuery,
  useAnalyticsMarketsQuery,
  useAnalyticsOverviewQuery,
  useAnalyticsProductionQuery,
  useAnalyticsProductsQuery,
  useAnalyticsTrendQuery,
  useTagihanJatuhTempoQuery,
} from "./queries";
import { useAnalyticsFilterStore } from "./store";
import {
  buildBiggestOpportunity,
  buildBiggestRisk,
  buildBusinessHealth,
  buildExecutiveInsights,
  buildPrioritizedQuickActions,
  buildRecommendations,
  trendDirection,
} from "./utils";

export function useAnalyticsFilter() {
  const filter = useAnalyticsFilterStore((s) => s.filter);
  const granularity = useAnalyticsFilterStore((s) => s.granularity);
  const datePreset = useAnalyticsFilterStore((s) => s.datePreset);
  const setDateRange = useAnalyticsFilterStore((s) => s.setDateRange);
  const setLocation = useAnalyticsFilterStore((s) => s.setLocation);
  const setKode = useAnalyticsFilterStore((s) => s.setKode);
  const setGranularity = useAnalyticsFilterStore((s) => s.setGranularity);
  const setDatePreset = useAnalyticsFilterStore((s) => s.setDatePreset);
  const resetFilter = useAnalyticsFilterStore((s) => s.resetFilter);

  return {
    filter,
    granularity,
    datePreset,
    setDateRange,
    setLocation,
    setKode,
    setGranularity,
    setDatePreset,
    resetFilter,
  };
}

export function useAnalyticsOverview() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsOverviewQuery(filter);

  return {
    kpi: data?.kpi ?? {
      totalRevenue: 0,
      totalProfit: 0,
      totalQty: 0,
      totalTransaksi: 0,
      totalCustomer: 0,
      aov: 0,
    },
    quickInsight: data?.quickInsight ?? {
      produkTerlaris: null,
      produkProfitTertinggi: null,
      pasarTerbaik: null,
      customerTerbaik: null,
    },
    marketSummary: data?.marketSummary ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsTrend() {
  const { filter, granularity } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsTrendQuery({ ...filter, granularity });

  return {
    granularity: data?.granularity ?? granularity,
    buckets: data?.buckets ?? [],
    topProductTrend: data?.topProductTrend ?? [],
    marketTrend: data?.marketTrend ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsProducts() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsProductsQuery({
    ...filter,
    lowStockCoverDays: LOW_STOCK_COVER_DAYS,
  });

  return {
    leaderboard: data?.leaderboard ?? {
      terlaris: [],
      omsetTertinggi: [],
      profitTertinggi: [],
      marginTertinggi: [],
      marginTerendah: [],
    },
    harga: data?.harga ?? {
      hppTertinggi: [],
      hppTerendah: [],
      hargaJualTertinggi: [],
      hargaJualTerendah: [],
    },
    movement: data?.movement ?? { fastMoving: [], slowMoving: [] },
    inventory: data?.inventory ?? {
      stokTerbanyak: [],
      stokHampirHabis: [],
      tidakPernahTerjual: [],
      tidakAdaPenjualanPeriode: [],
    },
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsMarkets() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsMarketsQuery({
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    kode: filter.kode,
  });

  return {
    markets: data?.markets ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsMarketDetail(market) {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsMarketDetailQuery({
    market,
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    kode: filter.kode,
  });

  return {
    revenue: data?.revenue ?? 0,
    profit: data?.profit ?? 0,
    qty: data?.qty ?? 0,
    customer: data?.customer ?? 0,
    produkTerlaris: data?.produkTerlaris ?? [],
    trend: data?.trend ?? { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsCustomers() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsCustomersQuery(filter);

  return {
    leaderboard: data?.leaderboard ?? {
      revenueTertinggi: [],
      profitTertinggi: [],
      qtyTerbanyak: [],
    },
    insight: data?.insight ?? {
      customerBaru: 0,
      repeatCustomer: 0,
      avgOrder: 0,
      ltv: 0,
      anonymousTransactionCount: 0,
      anonymousRevenue: 0,
    },
    ranking: data?.ranking ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsAdvanced() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsAdvancedQuery(filter);

  return {
    kpi: data?.kpi ?? {
      returnRate: 0,
      returnRevenueImpact: 0,
      overallMarginPct: 0,
      avgBasketSize: 0,
      avgItemPerTransaksi: 0,
    },
    growth: data?.growth ?? { topGrowth: [], topDeclining: [] },
    contribution: data?.contribution ?? { revenueByProduct: [], profitByProduct: [] },
    productMix: data?.productMix ?? [],
    pareto: data?.pareto ?? { items: [], productsFor80Pct: 0, totalProducts: 0 },
    newVsReturning: data?.newVsReturning ?? {
      newRevenue: 0,
      returningRevenue: 0,
      anonymousRevenue: 0,
      newCustomerCount: 0,
      returningCustomerCount: 0,
    },
    weekdayPerformance: data?.weekdayPerformance ?? [],
    hourlyPerformance: data?.hourlyPerformance ?? [],
    periodComparison: data?.periodComparison ?? { mom: null, yoy: null, wow: null },
    abcClassification: data?.abcClassification ?? {
      thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
      a: { count: 0, revenuePct: 0 },
      b: { count: 0, revenuePct: 0 },
      c: { count: 0, revenuePct: 0 },
    },
    revenueConcentration: data?.revenueConcentration ?? { top5Pct: 0, top10Pct: 0 },
    customerConcentration: data?.customerConcentration ?? {
      top5Pct: 0,
      top5CustomerCount: 0,
      totalIdentifiedCustomers: 0,
    },
    marketConcentration: data?.marketConcentration ?? [],
    marginRisk: data?.marginRisk ?? {
      lowMarginThresholdPct: 10,
      negativeMarginProducts: [],
      lowMarginProducts: [],
    },
    salesDistribution: data?.salesDistribution ?? {
      weekday: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
      weekend: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
    },
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsInventory() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsInventoryQuery({
    ...filter,
    lowStockCoverDays: LOW_STOCK_COVER_DAYS,
    criticalCoverDays: CRITICAL_COVER_DAYS,
    overstockCoverDays: OVERSTOCK_COVER_DAYS,
    deadStockDays: DEAD_STOCK_DAYS,
    restockTargetDays: RESTOCK_TARGET_DAYS,
  });

  return {
    summary: data?.summary ?? {
      totalInventoryValue: 0,
      totalSkuWithStock: 0,
      avgDailyCogs: 0,
      daysOfInventory: 0,
      inventoryTurnover: 0,
      method: "days_of_inventory_from_current_stock_and_period_cogs",
    },
    stockHealth: data?.stockHealth ?? {
      dead: 0,
      critical: 0,
      low: 0,
      healthy: 0,
      overstock: 0,
      noMovementPeriod: 0,
    },
    deadStock: data?.deadStock ?? [],
    agingStock: data?.agingStock ?? [],
    overstock: data?.overstock ?? [],
    understock: data?.understock ?? [],
    suggestedRestock: data?.suggestedRestock ?? [],
    restockPriority: data?.restockPriority ?? [],
    stockRiskIndicator: data?.stockRiskIndicator ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsForecast() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsForecastQuery({
    ...filter,
    granularity: FORECAST_GRANULARITY_DEFAULT,
    alpha: FORECAST_ALPHA_DEFAULT,
    lookbackPeriods: FORECAST_LOOKBACK_PERIODS_DEFAULT,
    restockHorizonPeriods: FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT,
  });

  const emptySeries = { history: [], ma: null, wma: null, es: null };

  return {
    meta: data?.meta ?? {
      granularity: FORECAST_GRANULARITY_DEFAULT,
      historyBucketCount: 0,
      alpha: FORECAST_ALPHA_DEFAULT,
      lookbackPeriods: FORECAST_LOOKBACK_PERIODS_DEFAULT,
      nextPeriodeLabel: null,
    },
    revenueForecast: data?.revenueForecast ?? emptySeries,
    profitForecast: data?.profitForecast ?? emptySeries,
    salesForecast: data?.salesForecast ?? emptySeries,
    customerForecast: data?.customerForecast ?? emptySeries,
    productDemandForecast: data?.productDemandForecast ?? [],
    restockForecast: data?.restockForecast ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

export function useAnalyticsProduction() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsProductionQuery({
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    kode: filter.kode,
  });

  return {
    batches: data?.batches ?? [],
    ringkasan: data?.ringkasan ?? {
      totalBatch: 0,
      totalBaju: 0,
      totalModal: 0,
      hppAvg: 0,
      hargaJualAvg: 0,
      avgSellThroughPct: 0,
      batchesMissingHpp: 0,
    },
    totalAllTime: data?.totalAllTime ?? { totalBatch: 0, totalBaju: 0, totalModal: 0 },
    bahanUsage: data?.bahanUsage ?? [],
    bahanUsageByJenis: data?.bahanUsageByJenis ?? [],
    dataQuality: data?.dataQuality ?? { batchesMissingHpp: 0, batchesTotal: 0 },
    loading: isLoading,
    error,
    refetch,
  };
}

export function useTagihanJatuhTempo() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useTagihanJatuhTempoQuery({
    fromDate: filter.fromDate,
    toDate: filter.toDate,
  });

  return { tagihan: data ?? [], loading: isLoading, error, refetch };
}

export function useAnalyticsExecutive() {
  const overview = useAnalyticsOverview();
  const advanced = useAnalyticsAdvanced();
  const customers = useAnalyticsCustomers();
  const inventory = useAnalyticsInventory();
  const forecast = useAnalyticsForecast();

  const loading =
    overview.loading ||
    advanced.loading ||
    customers.loading ||
    inventory.loading ||
    forecast.loading;
  const error =
    overview.error || advanced.error || customers.error || inventory.error || forecast.error;

  function refetch() {
    overview.refetch();
    advanced.refetch();
    customers.refetch();
    inventory.refetch();
    forecast.refetch();
  }

  const businessHealth = buildBusinessHealth({
    momPctChange: advanced.periodComparison.mom?.pctChange ?? null,
    overallMarginPct: advanced.kpi.overallMarginPct,
    returnRate: advanced.kpi.returnRate,
    deadStockCount: inventory.stockHealth.dead,
    overstockCount: inventory.stockHealth.overstock,
  });

  return {
    kpi: {
      revenue: overview.kpi.totalRevenue,
      profit: overview.kpi.totalProfit,
      marginPct: advanced.kpi.overallMarginPct,
      growthMomPct: advanced.periodComparison.mom?.pctChange ?? null,
      customer: overview.kpi.totalCustomer,
      transaksi: overview.kpi.totalTransaksi,
      repeatCustomer: customers.insight.repeatCustomer,
    },
    businessHealth,
    bestProduct: overview.quickInsight.produkTerlaris,
    bestCustomer: overview.quickInsight.customerTerbaik,
    bestMarket: overview.quickInsight.pasarTerbaik,
    biggestOpportunity: buildBiggestOpportunity(forecast.restockForecast),
    biggestRisk: buildBiggestRisk({
      deadStock: inventory.deadStock,
      negativeMarginProducts: advanced.marginRisk.negativeMarginProducts,
    }),
    insights: buildExecutiveInsights({ overview, advanced, inventory, forecast }),
    recommendations: buildRecommendations({ advanced, inventory, forecast }),
    forecastSummary: {
      meta: forecast.meta,
      revenue: forecast.revenueForecast,
      profit: forecast.profitForecast,
      sales: forecast.salesForecast,
    },
    inventorySummary: {
      deadStockCount: inventory.stockHealth.dead,
      criticalStockCount: inventory.stockHealth.critical,
      totalInventoryValue: inventory.summary.totalInventoryValue,
      daysOfInventory: inventory.summary.daysOfInventory,
    },
    quickActions: {
      restockCount: inventory.suggestedRestock.length,
      negativeMarginCount: advanced.marginRisk.negativeMarginProducts.length,
      deadStockCount: inventory.stockHealth.dead,
    },
    quickActionsPrioritized: buildPrioritizedQuickActions({
      restockCount: inventory.suggestedRestock.length,
      restockKodes: inventory.suggestedRestock.slice(0, 3).map((r) => r.kode),
      criticalStockCount: inventory.stockHealth.critical,
      negativeMarginCount: advanced.marginRisk.negativeMarginProducts.length,
      lowStockCount: inventory.stockHealth.low,
      deadStockCount: inventory.stockHealth.dead,
      demandTrend: trendDirection(forecast.salesForecast.history, forecast.salesForecast.es),
      revenueMomPctChange: advanced.periodComparison.mom?.pctChange ?? null,
    }),
    loading,
    error,
    refetch,
  };
}
