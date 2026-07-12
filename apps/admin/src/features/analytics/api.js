/**
 * features/analytics/api.js
 * Panggilan Supabase MENTAH untuk fitur Analytics (BI) — pure async, tidak
 * ada React di sini.
 *
 * Phase 1: analytics_overview() dan analytics_trend() (tab Overview +
 * Trends). Phase 2: analytics_products() (tab Products). Phase 3:
 * analytics_markets() + analytics_market_detail() (tab Markets). Phase 4:
 * analytics_customers() (tab Customers). Phase 6: analytics_advanced()
 * (tab Advanced — Return Rate, Margin portfolio, Growth/Declining Product,
 * Contribution, Product Mix, Pareto, New vs Returning, Basket Size,
 * Weekday/Hourly Performance, MoM/YoY). Phase 7: analytics_inventory()
 * (tab Inventory — Stock Health, Dead/Aging Stock, Overstock/Understock,
 * Inventory Value/Turnover, Days of Inventory, Suggested Restock, Restock
 * Priority, Stock Risk Indicator). Phase 8: analytics_forecast() (tab
 * Forecast — Revenue/Profit/Sales/Customer Forecast, Product Demand
 * Forecast, Restock Forecast — metode Moving Average/Weighted Moving
 * Average/Exponential Smoothing, TANPA AI/ML).
 *
 * Seluruh fungsi di bawah murni pemanggil RPC (pass-through) — SELURUH
 * agregasi (SUM/COUNT/AVG/GROUP BY/JOIN) sudah dihitung di PostgreSQL
 * (lihat supabase/migrations/20260712_analytics_phase1_rpc.sql,
 * 20260712_analytics_phase2_products_rpc.sql,
 * 20260712_analytics_phase3_markets_rpc.sql,
 * 20260712_analytics_phase4_customers_rpc.sql,
 * 20260712_analytics_phase6_advanced_rpc.sql, dan
 * 20260712_analytics_phase7_inventory_rpc.sql, dan
 * 20260712_analytics_phase8_forecast_rpc.sql). TIDAK ADA reduce()/map()
 * untuk business logic di file ini, sesuai prinsip project: PostgreSQL =
 * business logic, frontend = presentation layer.
 */
import { supabase } from "@deera/shared/lib/supabase";

// Ringkasan Overview (KPI + Quick Insight + Market Summary + trend kecil)
// untuk rentang & filter tertentu — dihitung SEPENUHNYA di RPC Postgres
// `analytics_overview` (yang di dalamnya juga memanggil `analytics_trend`
// secara internal untuk field `trend`, lihat komentar di migration SQL).
export async function fetchAnalyticsOverview({ fromDate, toDate, location, kode }) {
  const { data } = await supabase.rpc("analytics_overview", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
  });
  return (
    data ?? {
      kpi: { totalRevenue: 0, totalProfit: 0, totalQty: 0, totalTransaksi: 0, totalCustomer: 0, aov: 0 },
      quickInsight: { produkTerlaris: null, produkProfitTertinggi: null, pasarTerbaik: null, customerTerbaik: null },
      marketSummary: [],
      trend: { granularity: "day", buckets: [], topProductTrend: [], marketTrend: [] },
    }
  );
}

// Trend time-series (revenue/profit/qty per periode + top product trend +
// market trend) untuk rentang, filter, dan granularity tertentu — dihitung
// SEPENUHNYA di RPC Postgres `analytics_trend`.
export async function fetchAnalyticsTrend({ fromDate, toDate, location, kode, granularity }) {
  const { data } = await supabase.rpc("analytics_trend", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_granularity: granularity ?? "day",
  });
  return data ?? { granularity: granularity ?? "day", buckets: [], topProductTrend: [], marketTrend: [] };
}

// Bentuk kosong analytics_products — dipakai sebagai fallback (data null)
// DAN sebagai bentuk "tidak ada data" di hooks.js, supaya kedua tempat
// selalu konsisten (satu sumber kebenaran untuk shape kosong).
const EMPTY_PRODUCTS = {
  leaderboard: { terlaris: [], omsetTertinggi: [], profitTertinggi: [], marginTertinggi: [], marginTerendah: [] },
  harga: { hppTertinggi: [], hppTerendah: [], hargaJualTertinggi: [], hargaJualTerendah: [] },
  movement: { fastMoving: [], slowMoving: [] },
  inventory: { stokTerbanyak: [], stokHampirHabis: [], tidakPernahTerjual: [], tidakAdaPenjualanPeriode: [] },
};

// Ringkasan Products (Leaderboard + Harga + Movement + Inventory) untuk
// rentang & filter tertentu — dihitung SEPENUHNYA di RPC Postgres
// `analytics_products` (lihat migration SQL Phase 2). `lowStockCoverDays`
// dikirim sebagai parameter RPC (bukan hardcode di SQL), default 7 kalau
// tidak diisi — lihat LOW_STOCK_COVER_DAYS di constants.js.
export async function fetchAnalyticsProducts({ fromDate, toDate, location, kode, lowStockCoverDays }) {
  const { data } = await supabase.rpc("analytics_products", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_low_stock_cover_days: lowStockCoverDays ?? 7,
  });
  return data ?? EMPTY_PRODUCTS;
}

// Ringkasan Markets (breakdown per lokasi) — dihitung SEPENUHNYA di RPC
// Postgres `analytics_markets` (lihat migration SQL Phase 3).
//
// CATATAN PENTING: fungsi ini SENGAJA TIDAK menerima/mengirim `location`
// sama sekali — RPC `analytics_markets` tidak punya parameter p_location
// (lihat komentar panjang di migration SQL). Tab Markets SELALU
// menampilkan breakdown SELURUH market terlepas dari filter Market yang
// aktif di Global Filter Bar; hanya fromDate/toDate/kode yang diteruskan.
export async function fetchAnalyticsMarkets({ fromDate, toDate, kode }) {
  const { data } = await supabase.rpc("analytics_markets", {
    p_from: fromDate,
    p_to: toDate,
    p_kode: kode ?? null,
  });
  return data ?? { markets: [] };
}

// Detail 1 market (KPI kecil + Produk Terlaris + Trend Revenue) — dihitung
// SEPENUHNYA di RPC Postgres `analytics_market_detail`, yang di dalamnya
// MEMANGGIL analytics_trend() secara internal untuk field `trend` (tidak
// ada logika trend yang ditulis ulang di frontend maupun di RPC ini).
//
// LAZY BY DESIGN: fungsi ini HANYA boleh dipanggil setelah user memilih
// (klik/expand) 1 market — lihat `enabled: !!market` di
// useAnalyticsMarketDetailQuery (queries.js). Fungsi ini sendiri TIDAK
// melakukan guard apa pun (murni pemanggil RPC) — penegakan "jangan
// dipanggil sebelum user membuka detail" ada di layer queries.js/hooks.js,
// BUKAN di sini, konsisten dengan pola "api.js tidak tahu soal React/
// kondisi UI" di seluruh fitur ini.
export async function fetchAnalyticsMarketDetail({ market, fromDate, toDate, kode }) {
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

// Bentuk kosong analytics_customers — dipakai sebagai fallback (data null)
// DAN sebagai bentuk "tidak ada data" di hooks.js, sama pola dengan
// EMPTY_PRODUCTS di atas.
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

// Ringkasan Customers (Leaderboard + Insight + Ranking) untuk rentang &
// filter tertentu — dihitung SEPENUHNYA di RPC Postgres
// `analytics_customers` (lihat migration SQL Phase 4). Identitas customer
// di output pakai `nama` (BUKAN kode seperti Products — pelanggan memang
// tidak punya kode, lihat catatan di migration SQL & CustomersTab.jsx).
export async function fetchAnalyticsCustomers({ fromDate, toDate, location, kode }) {
  const { data } = await supabase.rpc("analytics_customers", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
  });
  return data ?? EMPTY_CUSTOMERS;
}

// Bentuk kosong analytics_advanced — dipakai sebagai fallback (data null)
// DAN sebagai bentuk "tidak ada data" di hooks.js, sama pola dengan
// EMPTY_PRODUCTS/EMPTY_CUSTOMERS di atas. `periodComparison.mom`/`.yoy`/`.wow`
// SENGAJA null di bentuk kosong ini — RPC memang mengembalikan null kalau
// data historis belum cukup 2 periode kalender penuh (lihat migration SQL
// Phase 6), BUKAN bug fallback.
//
// CATATAN Phase 6 EXTENSION (additive, lihat migration
// 20260712_analytics_phase6_extension_rpc.sql): field
// abcClassification/revenueConcentration/customerConcentration/
// marketConcentration/marginRisk/salesDistribution DITAMBAHKAN di bawah —
// SELURUH field yang sudah ada di atas (kpi..periodComparison.mom/yoy)
// TIDAK diubah sama sekali, hanya `periodComparison.wow` yang ditambahkan
// sebagai sibling key baru.
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

// Ringkasan Advanced Analytics (Return Rate, Margin portfolio, Growth/
// Declining Product, Contribution, Product Mix, Pareto 80/20, New vs
// Returning, Basket Size, Weekday/Hourly Performance, MoM/YoY/WoW, ABC
// Classification, Revenue/Customer/Market Concentration, Margin Risk,
// Sales Distribution) untuk rentang & filter tertentu — dihitung
// SEPENUHNYA di RPC Postgres `analytics_advanced` (migration SQL Phase 6 +
// Phase 6 Extension additive). `lowMarginThreshold` dikirim sebagai
// PARAMETER RPC (p_low_margin_threshold, default 0.10 = 10%) — bukan
// hardcode SQL, pola sama LOW_STOCK_COVER_DAYS dkk. Parameter ini
// OPSIONAL (RPC punya DEFAULT value) — pemanggilan lama tanpa
// lowMarginThreshold tetap valid.
export async function fetchAnalyticsAdvanced({ fromDate, toDate, location, kode, lowMarginThreshold }) {
  const { data } = await supabase.rpc("analytics_advanced", {
    p_from: fromDate,
    p_to: toDate,
    p_location: location ?? null,
    p_kode: kode ?? null,
    p_low_margin_threshold: lowMarginThreshold ?? 0.1,
  });
  return data ?? EMPTY_ADVANCED;
}

// Bentuk kosong analytics_inventory — dipakai sebagai fallback (data null)
// DAN sebagai bentuk "tidak ada data" di hooks.js, sama pola dengan
// EMPTY_PRODUCTS/EMPTY_CUSTOMERS/EMPTY_ADVANCED di atas.
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

// Ringkasan Inventory Intelligence (Stock Health, Dead/Aging Stock,
// Overstock/Understock, Inventory Value/Turnover, Days of Inventory,
// Suggested Restock, Restock Priority, Stock Risk Indicator) untuk rentang
// & filter tertentu — dihitung SEPENUHNYA di RPC Postgres
// `analytics_inventory` (lihat migration SQL Phase 7). Threshold
// (lowStockCoverDays/criticalCoverDays/overstockCoverDays/deadStockDays/
// restockTargetDays) dikirim sebagai parameter RPC (bukan hardcode di
// SQL), default masuk akal kalau tidak diisi — lihat constants.js.
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
}) {
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

// Bentuk kosong analytics_forecast — dipakai sebagai fallback (data null)
// DAN sebagai bentuk "tidak ada data" di hooks.js, sama pola dengan
// EMPTY_INVENTORY/EMPTY_ADVANCED di atas. `ma`/`wma`/`es` SENGAJA null di
// bentuk kosong ini — RPC memang mengembalikan null kalau histori < 2
// periode (lihat migration Phase 8), BUKAN bug fallback.
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

// Ringkasan Forecast (Revenue/Profit/Sales/Customer Forecast, Product
// Demand Forecast, Restock Forecast) untuk rentang & filter tertentu —
// dihitung SEPENUHNYA di RPC Postgres `analytics_forecast` (lihat
// migration SQL Phase 8). Metode: Moving Average/Weighted Moving Average/
// Exponential Smoothing (TANPA AI/ML, lihat catatan di migration SQL).
// granularity/alpha/lowbackPeriods/restockHorizonPeriods dikirim sebagai
// parameter RPC (bukan hardcode di SQL), default masuk akal kalau tidak
// diisi — lihat constants.js.
export async function fetchAnalyticsForecast({
  fromDate,
  toDate,
  location,
  kode,
  granularity,
  alpha,
  lookbackPeriods,
  restockHorizonPeriods,
}) {
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
