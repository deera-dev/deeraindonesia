import { supabase } from "@deera/shared/lib/supabase";
import type {
  AnalyticsAdvanced,
  AnalyticsCustomers,
  AnalyticsForecast,
  AnalyticsInventory,
  AnalyticsMarketDetail,
  AnalyticsMarkets,
  AnalyticsOverview,
  AnalyticsProduction,
  AnalyticsProducts,
  TagihanItem,
  TrendData,
} from "./schema";

export async function fetchAnalyticsOverview({
  fromDate,
  toDate,
  location,
  kode,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
}): Promise<AnalyticsOverview> {
  const { data } = await supabase.rpc("analytics_overview", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
  });
  return (
    data ?? {
      kpi: {
        totalRevenue: 0,
        totalProfit: 0,
        totalQty: 0,
        totalTransaksi: 0,
        totalCustomer: 0,
        aov: 0,
      },
      quickInsight: {
        produkTerlaris: null,
        produkProfitTertinggi: null,
        pasarTerbaik: null,
        customerTerbaik: null,
      },
      marketSummary: [],
      trend: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
    }
  );
}

export async function fetchAnalyticsTrend({
  fromDate,
  toDate,
  location,
  kode,
  granularity,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
  granularity?: string;
}): Promise<TrendData> {
  const { data } = await supabase.rpc("analytics_trend", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_granularity: granularity ?? "day",
  });
  return (
    data ?? { granularity: granularity ?? "day", buckets: [], topProductTrend: [], marketTrend: [] }
  );
}

const EMPTY_PRODUCTS: AnalyticsProducts = {
  leaderboard: {
    terlaris: [],
    omsetTertinggi: [],
    profitTertinggi: [],
    marginTertinggi: [],
    marginTerendah: [],
  },
  harga: { hppTertinggi: [], hppTerendah: [], hargaJualTertinggi: [], hargaJualTerendah: [] },
  movement: { fastMoving: [], slowMoving: [] },
  inventory: {
    stokTerbanyak: [],
    stokHampirHabis: [],
    tidakPernahTerjual: [],
    tidakAdaPenjualanPeriode: [],
  },
};

export async function fetchAnalyticsProducts({
  fromDate,
  toDate,
  location,
  kode,
  lowStockCoverDays,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
  lowStockCoverDays?: number;
}): Promise<AnalyticsProducts> {
  const { data } = await supabase.rpc("analytics_products", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_low_stock_cover_days: lowStockCoverDays ?? 7,
  });
  return data ?? EMPTY_PRODUCTS;
}

export async function fetchAnalyticsMarkets({
  fromDate,
  toDate,
  kode,
}: {
  fromDate: string;
  toDate: string;
  kode?: string | null;
}): Promise<AnalyticsMarkets> {
  const { data } = await supabase.rpc("analytics_markets", {
    p_from: fromDate,
    p_to: toDate,
    p_kode: kode ?? null,
  });
  return data ?? { markets: [] };
}

export async function fetchAnalyticsMarketDetail({
  market,
  fromDate,
  toDate,
  kode,
}: {
  market: string;
  fromDate: string;
  toDate: string;
  kode?: string | null;
}): Promise<AnalyticsMarketDetail> {
  const { data } = await supabase.rpc("analytics_market_detail", {
    p_market: market,
    p_from: fromDate,
    p_to: toDate,
    p_kode: kode ?? null,
  });
  return (
    data ?? {
      revenue: 0,
      profit: 0,
      qty: 0,
      customer: 0,
      produkTerlaris: [],
      trend: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
    }
  );
}

const EMPTY_CUSTOMERS: AnalyticsCustomers = {
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

export async function fetchAnalyticsCustomers({
  fromDate,
  toDate,
  location,
  kode,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
}): Promise<AnalyticsCustomers> {
  const { data } = await supabase.rpc("analytics_customers", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
  });
  return data ?? EMPTY_CUSTOMERS;
}

const EMPTY_ADVANCED: AnalyticsAdvanced = {
  kpi: {
    returnRate: 0,
    returnRevenueImpact: 0,
    overallMarginPct: 0,
    avgBasketSize: 0,
    avgItemPerTransaksi: 0,
  },
  growth: { topGrowth: [], topDeclining: [] },
  contribution: { revenueByProduct: [], profitByProduct: [] },
  productMix: [],
  pareto: { items: [], productsFor80Pct: 0, totalProducts: 0 },
  newVsReturning: {
    newRevenue: 0,
    returningRevenue: 0,
    anonymousRevenue: 0,
    newCustomerCount: 0,
    returningCustomerCount: 0,
  },
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

export async function fetchAnalyticsAdvanced({
  fromDate,
  toDate,
  location,
  kode,
  lowMarginThreshold,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
  lowMarginThreshold?: number;
}): Promise<AnalyticsAdvanced> {
  const { data } = await supabase.rpc("analytics_advanced", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_low_margin_threshold: lowMarginThreshold ?? 0.1,
  });
  return data ?? EMPTY_ADVANCED;
}

const EMPTY_INVENTORY: AnalyticsInventory = {
  summary: {
    totalInventoryValue: 0,
    totalSkuWithStock: 0,
    avgDailyCogs: 0,
    daysOfInventory: 0,
    inventoryTurnover: 0,
    method: "days_of_inventory_from_current_stock_and_period_cogs",
  },
  stockHealth: { dead: 0, critical: 0, low: 0, healthy: 0, overstock: 0, noMovementPeriod: 0 },
  deadStock: [],
  agingStock: [],
  overstock: [],
  understock: [],
  suggestedRestock: [],
  restockPriority: [],
  stockRiskIndicator: [],
};

export async function fetchAnalyticsInventory({
  fromDate,
  toDate,
  location,
  kode,
  lowStockCoverDays,
  criticalCoverDays,
  overstockCoverDays,
  deadStockDays,
  restockTargetDays,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
  lowStockCoverDays?: number;
  criticalCoverDays?: number;
  overstockCoverDays?: number;
  deadStockDays?: number;
  restockTargetDays?: number;
}): Promise<AnalyticsInventory> {
  const { data } = await supabase.rpc("analytics_inventory", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_low_stock_cover_days: lowStockCoverDays ?? 7,
    p_critical_cover_days: criticalCoverDays ?? 3,
    p_overstock_cover_days: overstockCoverDays ?? 60,
    p_dead_stock_days: deadStockDays ?? 30,
    p_restock_target_days: restockTargetDays ?? 30,
  });
  return data ?? EMPTY_INVENTORY;
}

const EMPTY_FORECAST_SERIES = { history: [], ma: null, wma: null, es: null };
const EMPTY_FORECAST: AnalyticsForecast = {
  meta: {
    granularity: "week",
    historyBucketCount: 0,
    alpha: 0.3,
    lookbackPeriods: 8,
    nextPeriodeLabel: null,
  },
  revenueForecast: EMPTY_FORECAST_SERIES,
  profitForecast: EMPTY_FORECAST_SERIES,
  salesForecast: EMPTY_FORECAST_SERIES,
  customerForecast: EMPTY_FORECAST_SERIES,
  productDemandForecast: [],
  restockForecast: [],
};

export async function fetchAnalyticsForecast({
  fromDate,
  toDate,
  location,
  kode,
  granularity,
  alpha,
  lookbackPeriods,
  restockHorizonPeriods,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
  granularity?: string;
  alpha?: number;
  lookbackPeriods?: number;
  restockHorizonPeriods?: number;
}): Promise<AnalyticsForecast> {
  const { data } = await supabase.rpc("analytics_forecast", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_granularity: granularity ?? "week",
    p_alpha: alpha ?? 0.3,
    p_lookback_periods: lookbackPeriods ?? 8,
    p_restock_horizon_periods: restockHorizonPeriods ?? 2,
  });
  return data ?? EMPTY_FORECAST;
}

const EMPTY_PRODUCTION: AnalyticsProduction = {
  batches: [],
  ringkasan: {
    totalBatch: 0,
    totalBaju: 0,
    totalModal: 0,
    hppAvg: 0,
    hargaJualAvg: 0,
    avgSellThroughPct: 0,
    batchesMissingHpp: 0,
  },
  totalAllTime: { totalBatch: 0, totalBaju: 0, totalModal: 0 },
  bahanUsage: [],
  bahanUsageByJenis: [],
  dataQuality: { batchesMissingHpp: 0, batchesTotal: 0 },
};

export async function fetchAnalyticsProduction({
  fromDate,
  toDate,
  kode,
}: {
  fromDate: string;
  toDate: string;
  kode?: string | null;
}): Promise<AnalyticsProduction> {
  const { data } = await supabase.rpc("analytics_production", {
    p_from: fromDate,
    p_to: toDate,
    p_kode: kode ?? null,
  });
  return data ?? EMPTY_PRODUCTION;
}

export async function fetchTagihanJatuhTempo({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate: string;
}): Promise<TagihanItem[]> {
  const [{ data: beli }, { data: pinjam }] = await Promise.all([
    supabase
      .from("bahan_pembelian")
      .select("*")
      .eq("status_bayar", "belum")
      .gte("jatuh_tempo", fromDate)
      .lte("jatuh_tempo", toDate)
      .order("jatuh_tempo"),
    supabase
      .from("bahan_pinjam")
      .select("*")
      .eq("status_bayar", "belum")
      .gte("jatuh_tempo", fromDate)
      .lte("jatuh_tempo", toDate)
      .order("jatuh_tempo"),
  ]);

  return [
    ...(beli ?? []).map((r) => ({ ...r, _type: "beli" as const })),
    ...(pinjam ?? []).map((r) => ({ ...r, _type: "pinjam" as const })),
  ].sort((a, b) => new Date(a.jatuh_tempo).getTime() - new Date(b.jatuh_tempo).getTime());
}
