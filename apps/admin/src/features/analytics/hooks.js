/**
 * features/analytics/hooks.js
 * PUBLIC SURFACE — komponen WAJIB import HANYA dari sini (atau index.js).
 * Menggabungkan queries.js (TanStack Query) + store.js (Zustand) — komponen
 * tidak pernah menyentuh keduanya secara langsung.
 *
 * CATATAN Phase 5 (Dashboard Polish): setiap hook data (Overview/Trend/
 * Products/Markets/MarketDetail/Customers) sekarang JUGA mengekspos
 * `refetch` (pass-through murni dari `useQuery().refetch`) — dipakai
 * tombol "Coba Lagi" di <ErrorState/> (lihat components/shared/
 * ErrorState.jsx) supaya user bisa retry manual saat RPC gagal, tanpa
 * perlu reload halaman penuh. `error` SUDAH ada sejak Phase 1, hanya BARU
 * benar-benar dikonsumsi oleh komponen tab mulai Phase 5.
 */
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
  useAnalyticsProductionQuery,
  useTagihanJatuhTempoQuery,
} from "./queries";
import { useAnalyticsFilterStore } from "./store";
import {
  LOW_STOCK_COVER_DAYS,
  CRITICAL_COVER_DAYS,
  OVERSTOCK_COVER_DAYS,
  DEAD_STOCK_DAYS,
  RESTOCK_TARGET_DAYS,
  FORECAST_GRANULARITY_DEFAULT,
  FORECAST_ALPHA_DEFAULT,
  FORECAST_LOOKBACK_PERIODS_DEFAULT,
  FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT,
} from "./constants";
import {
  buildBusinessHealth,
  buildBiggestOpportunity,
  buildBiggestRisk,
  buildExecutiveInsights,
  buildRecommendations,
  buildPrioritizedQuickActions,
  trendDirection,
} from "./utils";

// Global Filter (Date Range, Market, Product) — dipakai GlobalFilterBar dan
// semua tab untuk membaca filter aktif.
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

// Tab Overview — pass-through murni dari RPC analytics_overview. KPI,
// Quick Insight, Market Summary SUDAH dihitung sepenuhnya di Postgres
// (lihat api.js) — hook ini TIDAK melakukan reduce/business logic apa pun.
//
// CATATAN (requirement change 2026-07): RPC analytics_overview MASIH
// mengembalikan field `trend` di dalam `data` (backward-compat, RPC-nya
// TIDAK diubah) — tapi hook ini SENGAJA TIDAK LAGI mengekspos field
// tersebut ke komponen, karena tab Overview tidak lagi menampilkan trend/
// chart apa pun (dipindah sepenuhnya ke tab Trends, lihat
// useAnalyticsTrend() di bawah). Kalau butuh trend, panggil
// useAnalyticsTrend(), BUKAN membaca field trend dari sini.
export function useAnalyticsOverview() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsOverviewQuery(filter);

  return {
    kpi: data?.kpi ?? { totalRevenue: 0, totalProfit: 0, totalQty: 0, totalTransaksi: 0, totalCustomer: 0, aov: 0 },
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

// Tab Trends — pass-through murni dari RPC analytics_trend, memakai
// granularity yang dipilih user (dari Global Filter store).
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

// Tab Products — pass-through murni dari RPC analytics_products.
// Leaderboard, Harga, Movement, Inventory SUDAH dihitung sepenuhnya di
// Postgres (lihat api.js + migration Phase 2) — hook ini TIDAK melakukan
// reduce/sort/business logic apa pun, hanya fallback ke struktur kosong
// selama data belum termuat. `lowStockCoverDays` dikirim dari konstanta FE
// (LOW_STOCK_COVER_DAYS) sebagai parameter RPC, bukan hardcode di SQL.
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

// Tab Markets (initial load) — pass-through murni dari RPC
// analytics_markets. SENGAJA hanya meneruskan fromDate/toDate/kode dari
// Global Filter — `filter.location` TIDAK diteruskan (lihat catatan
// panjang di api.js/fetchAnalyticsMarkets dan migration SQL Phase 3:
// tab Markets selalu menampilkan breakdown SELURUH market, filter Market
// di Global Filter Bar tidak relevan untuk RPC ini).
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

// Detail 1 market — LAZY BY DESIGN. `market` adalah string lokasi yang
// SEDANG di-expand user di UI (state lokal komponen, lihat MarketsTab.jsx),
// atau `null`/`undefined` kalau belum ada yang di-expand. Selama `market`
// falsy, useAnalyticsMarketDetailQuery (queries.js) TIDAK menjalankan
// query sama sekali (`enabled: !!market`) — hook ini aman dipanggil
// unconditionally dari MarketsTab.jsx (aturan Rules of Hooks) TANPA
// men-trigger RPC sebelum waktunya.
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

// Tab Customers — pass-through murni dari RPC analytics_customers.
// Leaderboard, Insight, Ranking SUDAH dihitung sepenuhnya di Postgres
// (lihat api.js + migration Phase 4) — hook ini TIDAK melakukan reduce/
// sort/business logic apa pun, hanya fallback ke struktur kosong selama
// data belum termuat. Identitas customer di output pakai `nama` (BUKAN
// kode seperti Products — pelanggan tidak punya kode, lihat catatan di
// migration SQL Phase 4).
export function useAnalyticsCustomers() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsCustomersQuery(filter);

  return {
    leaderboard: data?.leaderboard ?? { revenueTertinggi: [], profitTertinggi: [], qtyTerbanyak: [] },
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

// Tab Advanced (Phase 6) — pass-through murni dari RPC analytics_advanced.
// Return Rate, Margin portfolio, Growth/Declining Product, Contribution,
// Product Mix, Pareto, New vs Returning, Basket Size, Weekday/Hourly
// Performance, MoM/YoY SUDAH dihitung sepenuhnya di Postgres (lihat api.js
// + migration Phase 6) — hook ini TIDAK melakukan reduce/sort/business
// logic apa pun, hanya fallback ke struktur kosong selama data belum
// termuat. `periodComparison.mom`/`.yoy` bisa `null` APA ADANYA dari RPC
// (data historis belum cukup 2 periode kalender penuh) — hook ini TIDAK
// mengubahnya jadi 0 atau nilai lain, komponen WAJIB menangani null secara
// eksplisit (lihat AdvancedTab.jsx).
export function useAnalyticsAdvanced() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useAnalyticsAdvancedQuery(filter);

  return {
    kpi: data?.kpi ?? { returnRate: 0, returnRevenueImpact: 0, overallMarginPct: 0, avgBasketSize: 0, avgItemPerTransaksi: 0 },
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
    // Phase 6 Extension (additive): `wow` ditambah sebagai sibling key baru
    // di periodComparison, `mom`/`yoy` TIDAK berubah.
    periodComparison: data?.periodComparison ?? { mom: null, yoy: null, wow: null },
    abcClassification: data?.abcClassification ?? {
      thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
      a: { count: 0, revenuePct: 0 },
      b: { count: 0, revenuePct: 0 },
      c: { count: 0, revenuePct: 0 },
    },
    revenueConcentration: data?.revenueConcentration ?? { top5Pct: 0, top10Pct: 0 },
    customerConcentration: data?.customerConcentration ?? { top5Pct: 0, top5CustomerCount: 0, totalIdentifiedCustomers: 0 },
    marketConcentration: data?.marketConcentration ?? [],
    marginRisk: data?.marginRisk ?? { lowMarginThresholdPct: 10, negativeMarginProducts: [], lowMarginProducts: [] },
    salesDistribution: data?.salesDistribution ?? {
      weekday: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
      weekend: { revenue: 0, profit: 0, qty: 0, transaksi: 0 },
    },
    loading: isLoading,
    error,
    refetch,
  };
}

// Tab Inventory (Phase 7) — pass-through murni dari RPC
// analytics_inventory. Stock Health, Dead/Aging Stock, Overstock/
// Understock, Inventory Value/Turnover, Days of Inventory, Suggested
// Restock, Restock Priority, Stock Risk Indicator SUDAH dihitung
// sepenuhnya di Postgres (lihat api.js + migration Phase 7) — hook ini
// TIDAK melakukan reduce/sort/business logic apa pun, hanya fallback ke
// struktur kosong selama data belum termuat. Threshold (cover days/dead
// stock days/restock target days) dikirim dari konstanta FE (lihat
// constants.js), sama pola dengan LOW_STOCK_COVER_DAYS di
// useAnalyticsProducts.
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
    stockHealth: data?.stockHealth ?? { dead: 0, critical: 0, low: 0, healthy: 0, overstock: 0, noMovementPeriod: 0 },
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

// Tab Forecast (Phase 8) — pass-through murni dari RPC analytics_forecast.
// Moving Average / Weighted Moving Average / Exponential Smoothing SUDAH
// dihitung sepenuhnya di Postgres (lihat api.js + migration Phase 8) —
// hook ini TIDAK melakukan kalkulasi forecast apa pun, hanya fallback ke
// struktur kosong selama data belum termuat. Parameter granularity/alpha/
// lookbackPeriods/restockHorizonPeriods dikirim dari konstanta FE (lihat
// constants.js), sama pola dengan LOW_STOCK_COVER_DAYS di
// useAnalyticsProducts/useAnalyticsInventory.
//
// PENTING (data-integrity, lihat migration SQL Phase 8): field `ma`/`wma`/
// `es` pada setiap *Forecast di bawah bisa bernilai `null` APA ADANYA dari
// RPC kalau histori belum cukup (< 2 titik data) — hook ini TIDAK mengubah
// null jadi 0, komponen (ForecastTab.jsx) WAJIB menangani null secara
// eksplisit dengan pesan "Data belum cukup", bukan merender 0 seolah itu
// adalah forecast yang valid.
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

// Tab Produksi (Phase 9) — pass-through murni dari RPC analytics_production
// (pindahan dari /produksi/laporan, lihat api.js untuk catatan lengkap).
// `batches`/`ringkasan`/`totalAllTime`/`bahanUsage`/`bahanUsageByJenis`/
// `dataQuality` SUDAH dihitung sepenuhnya di Postgres — hook ini TIDAK
// melakukan reduce/SUM/AVG/GROUP BY apa pun, hanya fallback ke struktur
// kosong selama data belum termuat. SENGAJA TIDAK meneruskan
// `filter.location` (produksi tidak punya dimensi lokasi/pasar).
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

// Tagihan jatuh tempo — pass-through murni, DIPINDAHKAN APA ADANYA dari
// features/produksi-laporan/hooks.js (useTagihanJatuhTempo). Mengikuti
// rentang tanggal Global Filter Bar yang SAMA dengan tab Produksi lainnya
// (BUKAN lagi filter bulan terpisah).
export function useTagihanJatuhTempo() {
  const { filter } = useAnalyticsFilter();
  const { data, isLoading, error, refetch } = useTagihanJatuhTempoQuery({
    fromDate: filter.fromDate,
    toDate: filter.toDate,
  });

  return { tagihan: data ?? [], loading: isLoading, error, refetch };
}

// Tab Executive (Phase 9) — AGREGATOR MURNI, TIDAK ADA RPC baru
// (analytics_executive() SENGAJA TIDAK dibuat, instruksi eksplisit Denny).
// Menggabungkan hook publik yang SUDAH ADA: useAnalyticsOverview (KPI +
// Best Product/Market/Customer via quickInsight), useAnalyticsAdvanced
// (margin/return rate/concentration/margin risk — termasuk field Phase 6
// Extension), useAnalyticsCustomers (HANYA untuk insight.repeatCustomer —
// satu-satunya angka di sini yang TIDAK tersedia dari hook lain),
// useAnalyticsInventory (stock health/restock/dead stock), dan
// useAnalyticsForecast (revenue/profit/sales forecast + restock forecast).
//
// SENGAJA TIDAK memanggil useAnalyticsProducts()/useAnalyticsMarkets()
// terpisah — "Best Product" & "Best Market" SUDAH tersedia lewat
// overview.quickInsight (analytics_overview menghitungnya sendiri), dan
// breakdown per-market SUDAH tersedia lewat advanced.marketConcentration
// (Phase 6 Extension) — memanggil analytics_products()/analytics_markets()
// lagi di sini akan jadi QUERY GANDA untuk data yang SAMA, melanggar aturan
// "Tidak duplicate query" (CLAUDE.md/roadmap). Kalau nanti Executive
// Dashboard butuh detail produk/market yang benar-benar tidak tercakup
// hook lain, baru hook itu ditambahkan — BUKAN dipanggil "supaya lengkap".
//
// Seluruh reshape/klasifikasi (business health, opportunity, risk,
// insight, recommendation) didelegasikan ke fungsi PURE di utils.js
// (buildBusinessHealth dkk) — hook ini hanya memanggil fungsi tsb dengan
// data yang sudah di-fetch, TIDAK ada logic tambahan di sini.
export function useAnalyticsExecutive() {
  const overview = useAnalyticsOverview();
  const advanced = useAnalyticsAdvanced();
  const customers = useAnalyticsCustomers();
  const inventory = useAnalyticsInventory();
  const forecast = useAnalyticsForecast();

  const loading = overview.loading || advanced.loading || customers.loading || inventory.loading || forecast.loading;
  const error = overview.error || advanced.error || customers.error || inventory.error || forecast.error;

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
    // Section 1 — Executive KPI (SELURUH angka pass-through dari
    // useAnalyticsOverview/useAnalyticsAdvanced, TIDAK dihitung ulang).
    kpi: {
      revenue: overview.kpi.totalRevenue,
      profit: overview.kpi.totalProfit,
      marginPct: advanced.kpi.overallMarginPct,
      growthMomPct: advanced.periodComparison.mom?.pctChange ?? null,
      customer: overview.kpi.totalCustomer,
      transaksi: overview.kpi.totalTransaksi,
      repeatCustomer: customers.insight.repeatCustomer,
    },
    // Section 2 — Business Health (status hijau/kuning/merah).
    businessHealth,
    // Section 3 — Best Performance (pass-through quickInsight, sudah
    // dihitung analytics_overview).
    bestProduct: overview.quickInsight.produkTerlaris,
    bestCustomer: overview.quickInsight.customerTerbaik,
    bestMarket: overview.quickInsight.pasarTerbaik,
    // Section 4 — Biggest Opportunity (pick top-N dari restockForecast,
    // diurutkan di utils.js — TIDAK ada kalkulasi baru).
    biggestOpportunity: buildBiggestOpportunity(forecast.restockForecast),
    // Section 5 — Biggest Risk (gabungan dead stock + margin negatif).
    biggestRisk: buildBiggestRisk({
      deadStock: inventory.deadStock,
      negativeMarginProducts: advanced.marginRisk.negativeMarginProducts,
    }),
    // Section 6 — Executive Insight (kalimat, HANYA yang datanya cukup).
    insights: buildExecutiveInsights({ overview, advanced, inventory, forecast }),
    // Section 7 — Recommendation.
    recommendations: buildRecommendations({ advanced, inventory, forecast }),
    // Section 8 — Forecast Summary (pass-through, TANPA chart besar —
    // ExecutiveTab.jsx hanya menampilkan angka ES/MA/WMA ringkas).
    forecastSummary: {
      meta: forecast.meta,
      revenue: forecast.revenueForecast,
      profit: forecast.profitForecast,
      sales: forecast.salesForecast,
    },
    // Section 9 — Inventory Summary (pass-through).
    inventorySummary: {
      deadStockCount: inventory.stockHealth.dead,
      criticalStockCount: inventory.stockHealth.critical,
      totalInventoryValue: inventory.summary.totalInventoryValue,
      daysOfInventory: inventory.summary.daysOfInventory,
    },
    // Section 10 — Quick Action (COUNT dari array yang SUDAH ada, bukan
    // hitungan baru). "Customer VIP belum transaksi" SENGAJA TIDAK
    // disertakan di sini — lihat laporan implementasi Phase 9 untuk
    // penjelasan keterbatasan data (tidak ada field tanggal transaksi
    // terakhir per pelanggan di RPC manapun saat ini).
    quickActions: {
      restockCount: inventory.suggestedRestock.length,
      negativeMarginCount: advanced.marginRisk.negativeMarginProducts.length,
      deadStockCount: inventory.stockHealth.dead,
    },
    // Tindakan Prioritas (Redesign UI/UX 2026-07, ADDITIVE — `quickActions`
    // di atas TETAP ada, tidak dihapus/diubah shape-nya, supaya tidak ada
    // breaking change untuk konsumen lain). Mengelompokkan sinyal yang
    // SUDAH ada (stok kritis/menipis/mati, margin negatif, tren demand,
    // tren revenue MoM) ke 3 keranjang urgensi — lihat
    // buildPrioritizedQuickActions() (utils.js) untuk detail & alasan.
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
