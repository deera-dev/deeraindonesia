export interface AnalyticsFilter {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
}

export interface TrendBucket {
  periode: string;
  revenue?: number;
  profit?: number;
  qty?: number;
  transaksi?: number;
  [key: string]: unknown;
}

export interface SeriesPoint {
  kode?: string;
  nama?: string;
  location?: string;
  periode?: string;
  value?: number;
  [key: string]: unknown;
}

export interface TrendData {
  granularity: string;
  buckets: TrendBucket[];
  topProductTrend: SeriesPoint[];
  marketTrend: SeriesPoint[];
}

export interface QuickInsightItem {
  kode?: string;
  nama?: string;
  location?: string;
  nama_pelanggan?: string;
  [key: string]: unknown;
}

export interface OverviewKpi {
  totalRevenue: number;
  totalProfit: number;
  totalQty: number;
  totalTransaksi: number;
  totalCustomer: number;
  aov: number;
}

export interface AnalyticsOverview {
  kpi: OverviewKpi;
  quickInsight: {
    produkTerlaris: QuickInsightItem | null;
    produkProfitTertinggi: QuickInsightItem | null;
    pasarTerbaik: QuickInsightItem | null;
    customerTerbaik: QuickInsightItem | null;
  };
  marketSummary: Array<Record<string, unknown>>;
  trend: TrendData;
}

export interface ProductListItem {
  kode: string;
  nama?: string;
  marginPct?: number;
  [key: string]: unknown;
}

export interface AnalyticsProducts {
  leaderboard: {
    terlaris: ProductListItem[];
    omsetTertinggi: ProductListItem[];
    profitTertinggi: ProductListItem[];
    marginTertinggi: ProductListItem[];
    marginTerendah: ProductListItem[];
  };
  harga: {
    hppTertinggi: ProductListItem[];
    hppTerendah: ProductListItem[];
    hargaJualTertinggi: ProductListItem[];
    hargaJualTerendah: ProductListItem[];
  };
  movement: { fastMoving: ProductListItem[]; slowMoving: ProductListItem[] };
  inventory: {
    stokTerbanyak: ProductListItem[];
    stokHampirHabis: ProductListItem[];
    tidakPernahTerjual: ProductListItem[];
    tidakAdaPenjualanPeriode: ProductListItem[];
  };
}

export interface MarketSummaryRow {
  location: string;
  revenue?: number;
  [key: string]: unknown;
}

export interface AnalyticsMarkets {
  markets: MarketSummaryRow[];
}

export interface AnalyticsMarketDetail {
  revenue: number;
  profit: number;
  qty: number;
  customer: number;
  produkTerlaris: ProductListItem[];
  trend: TrendData;
}

export interface CustomerListItem {
  nama_pelanggan?: string;
  pelanggan_id?: string;
  [key: string]: unknown;
}

export interface AnalyticsCustomers {
  leaderboard: {
    revenueTertinggi: CustomerListItem[];
    profitTertinggi: CustomerListItem[];
    qtyTerbanyak: CustomerListItem[];
  };
  insight: {
    customerBaru: number;
    repeatCustomer: number;
    avgOrder: number;
    ltv: number;
    anonymousTransactionCount: number;
    anonymousRevenue: number;
  };
  ranking: CustomerListItem[];
}

export interface PeriodComparisonEntry {
  pctChange: number;
  previousRevenue: number;
  currentRevenue: number;
  [key: string]: unknown;
}

export interface MarginRiskProduct {
  kode: string;
  marginPct: number;
  [key: string]: unknown;
}

export interface MarketConcentrationItem {
  location: string;
  value: number;
  pct: number;
  [key: string]: unknown;
}

export interface AnalyticsAdvanced {
  kpi: {
    returnRate: number;
    returnRevenueImpact: number;
    overallMarginPct: number;
    avgBasketSize: number;
    avgItemPerTransaksi: number;
  };
  growth: {
    topGrowth: Array<Record<string, unknown>>;
    topDeclining: Array<Record<string, unknown>>;
  };
  contribution: {
    revenueByProduct: Array<Record<string, unknown>>;
    profitByProduct: Array<Record<string, unknown>>;
  };
  productMix: Array<Record<string, unknown>>;
  pareto: {
    items: Array<Record<string, unknown>>;
    productsFor80Pct: number;
    totalProducts: number;
  };
  newVsReturning: {
    newRevenue: number;
    returningRevenue: number;
    anonymousRevenue: number;
    newCustomerCount: number;
    returningCustomerCount: number;
  };
  weekdayPerformance: Array<Record<string, unknown>>;
  hourlyPerformance: Array<Record<string, unknown>>;
  periodComparison: {
    mom: PeriodComparisonEntry | null;
    yoy: PeriodComparisonEntry | null;
    wow: PeriodComparisonEntry | null;
  };
  abcClassification: {
    thresholds: { aMaxCumulativePct: number; bMaxCumulativePct: number };
    a: { count: number; revenuePct: number };
    b: { count: number; revenuePct: number };
    c: { count: number; revenuePct: number };
  };
  revenueConcentration: { top5Pct: number; top10Pct: number };
  customerConcentration: {
    top5Pct: number;
    top5CustomerCount: number;
    totalIdentifiedCustomers: number;
  };
  marketConcentration: MarketConcentrationItem[];
  marginRisk: {
    lowMarginThresholdPct: number;
    negativeMarginProducts: MarginRiskProduct[];
    lowMarginProducts: MarginRiskProduct[];
  };
  salesDistribution: {
    weekday: { revenue: number; profit: number; qty: number; transaksi: number };
    weekend: { revenue: number; profit: number; qty: number; transaksi: number };
  };
}

export interface StockListItem {
  kode: string;
  [key: string]: unknown;
}

export interface AnalyticsInventory {
  summary: {
    totalInventoryValue: number;
    totalSkuWithStock: number;
    avgDailyCogs: number;
    daysOfInventory: number;
    inventoryTurnover: number;
    method: string;
  };
  stockHealth: {
    dead: number;
    critical: number;
    low: number;
    healthy: number;
    overstock: number;
    noMovementPeriod: number;
  };
  deadStock: StockListItem[];
  agingStock: StockListItem[];
  overstock: StockListItem[];
  understock: StockListItem[];
  suggestedRestock: StockListItem[];
  restockPriority: StockListItem[];
  stockRiskIndicator: StockListItem[];
}

export interface ForecastHistoryPoint {
  periode?: string;
  value: number;
  [key: string]: unknown;
}

export interface ForecastSeries {
  history: ForecastHistoryPoint[];
  ma: number | null;
  wma: number | null;
  es: number | null;
}

export interface RestockForecastItem {
  kode: string;
  forecastedDemandNextPeriod?: number;
  currentStock?: number;
  suggestedOrderQty?: number;
  [key: string]: unknown;
}

export interface AnalyticsForecast {
  meta: {
    granularity: string;
    historyBucketCount: number;
    alpha: number;
    lookbackPeriods: number;
    nextPeriodeLabel: string | null;
  };
  revenueForecast: ForecastSeries;
  profitForecast: ForecastSeries;
  salesForecast: ForecastSeries;
  customerForecast: ForecastSeries;
  productDemandForecast: Array<Record<string, unknown>>;
  restockForecast: RestockForecastItem[];
}

export interface ProduksiBatchRow {
  [key: string]: unknown;
}

export interface AnalyticsProduction {
  batches: ProduksiBatchRow[];
  ringkasan: {
    totalBatch: number;
    totalBaju: number;
    totalModal: number;
    hppAvg: number;
    hargaJualAvg: number;
    avgSellThroughPct: number;
    batchesMissingHpp: number;
  };
  totalAllTime: { totalBatch: number; totalBaju: number; totalModal: number };
  bahanUsage: Array<Record<string, unknown>>;
  bahanUsageByJenis: Array<Record<string, unknown>>;
  dataQuality: { batchesMissingHpp: number; batchesTotal: number };
}

export interface TagihanItem {
  id: string;
  nama_bahan?: string;
  jatuh_tempo: string;
  total_harga?: number;
  status_bayar: string;
  _type: "beli" | "pinjam";
  [key: string]: unknown;
}

export interface BusinessHealthItem {
  status: "green" | "yellow" | "red";
  label: string;
  detail: string;
}

export interface OpportunityItem {
  kode: string;
  detail: string;
}

export interface RiskItem {
  kode: string;
  category: string;
  detail: string;
}

export interface QuickActionItem {
  label: string;
  detail: string | null;
}

export interface PrioritizedQuickActions {
  tinggi: QuickActionItem[];
  sedang: QuickActionItem[];
  rendah: QuickActionItem[];
}
