/**
 * features/analytics/queries.js
 * Wrapper TanStack Query (useQuery) untuk fitur Analytics.
 *
 * queryKey WAJIB menyertakan SELURUH filter (fromDate, toDate, location,
 * kode, granularity/lowStockCoverDays/market) supaya cache benar per
 * kombinasi filter — konsisten dengan pola `fooKeys.list(filter)` di
 * fitur lain (lihat CLAUDE.md §14).
 */
import { useQuery } from "@tanstack/react-query";
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
  fetchAnalyticsProduction,
  fetchTagihanJatuhTempo,
} from "./api";

export const analyticsKeys = {
  all: ["analytics"],
  overview: (fromDate, toDate, location, kode) => [
    "analytics",
    "overview",
    fromDate,
    toDate,
    location,
    kode,
  ],
  trend: (fromDate, toDate, location, kode, granularity) => [
    "analytics",
    "trend",
    fromDate,
    toDate,
    location,
    kode,
    granularity,
  ],
  products: (fromDate, toDate, location, kode, lowStockCoverDays) => [
    "analytics",
    "products",
    fromDate,
    toDate,
    location,
    kode,
    lowStockCoverDays,
  ],
  markets: (fromDate, toDate, kode) => [
    "analytics",
    "markets",
    fromDate,
    toDate,
    kode,
  ],
  marketDetail: (market, fromDate, toDate, kode) => [
    "analytics",
    "marketDetail",
    market,
    fromDate,
    toDate,
    kode,
  ],
  customers: (fromDate, toDate, location, kode) => [
    "analytics",
    "customers",
    fromDate,
    toDate,
    location,
    kode,
  ],
  advanced: (fromDate, toDate, location, kode) => [
    "analytics",
    "advanced",
    fromDate,
    toDate,
    location,
    kode,
  ],
  inventory: (fromDate, toDate, location, kode, lowStockCoverDays, criticalCoverDays, overstockCoverDays, deadStockDays, restockTargetDays) => [
    "analytics",
    "inventory",
    fromDate,
    toDate,
    location,
    kode,
    lowStockCoverDays,
    criticalCoverDays,
    overstockCoverDays,
    deadStockDays,
    restockTargetDays,
  ],
  forecast: (fromDate, toDate, location, kode, granularity, alpha, lookbackPeriods, restockHorizonPeriods) => [
    "analytics",
    "forecast",
    fromDate,
    toDate,
    location,
    kode,
    granularity,
    alpha,
    lookbackPeriods,
    restockHorizonPeriods,
  ],
  production: (fromDate, toDate, kode) => ["analytics", "production", fromDate, toDate, kode],
  tagihanJatuhTempo: (fromDate, toDate) => ["analytics", "tagihanJatuhTempo", fromDate, toDate],
};

export function useAnalyticsOverviewQuery({ fromDate, toDate, location, kode }) {
  return useQuery({
    queryKey: analyticsKeys.overview(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsOverview({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsTrendQuery({ fromDate, toDate, location, kode, granularity }) {
  return useQuery({
    queryKey: analyticsKeys.trend(fromDate, toDate, location, kode, granularity),
    queryFn: () => fetchAnalyticsTrend({ fromDate, toDate, location, kode, granularity }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsProductsQuery({ fromDate, toDate, location, kode, lowStockCoverDays }) {
  return useQuery({
    queryKey: analyticsKeys.products(fromDate, toDate, location, kode, lowStockCoverDays),
    queryFn: () => fetchAnalyticsProducts({ fromDate, toDate, location, kode, lowStockCoverDays }),
    enabled: !!fromDate && !!toDate,
  });
}

// Initial load tab Markets — SELALU aktif begitu tanggal terisi (SAMA
// seperti pola query lain di atas). TIDAK menerima `location` (lihat
// catatan di api.js/fetchAnalyticsMarkets soal kenapa filter Market tidak
// relevan untuk RPC ini).
export function useAnalyticsMarketsQuery({ fromDate, toDate, kode }) {
  return useQuery({
    queryKey: analyticsKeys.markets(fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsMarkets({ fromDate, toDate, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

// Detail 1 market — LAZY BY DESIGN. `enabled: !!market` adalah SATU-
// SATUNYA tempat penegakan "analytics_market_detail() tidak boleh
// dipanggil sebelum user membuka detail market" (instruksi eksplisit
// §PERFORMANCE). Selama `market` masih null/undefined (belum ada market
// yang di-expand user), TanStack Query TIDAK PERNAH menjalankan queryFn —
// tidak ada request RPC yang terkirim ke Supabase sama sekali, bukan
// sekadar "dipanggil lalu hasilnya diabaikan".
export function useAnalyticsMarketDetailQuery({ market, fromDate, toDate, kode }) {
  return useQuery({
    queryKey: analyticsKeys.marketDetail(market, fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsMarketDetail({ market, fromDate, toDate, kode }),
    enabled: !!market && !!fromDate && !!toDate,
  });
}

// Tab Customers — pass-through murni dari RPC analytics_customers, SAMA
// pola dengan useAnalyticsProductsQuery/useAnalyticsOverviewQuery di atas
// (selalu aktif begitu tanggal terisi — TIDAK lazy seperti market detail,
// karena tab Customers punya 1 payload gabungan, bukan drill-down
// per-pelanggan seperti Markets).
export function useAnalyticsCustomersQuery({ fromDate, toDate, location, kode }) {
  return useQuery({
    queryKey: analyticsKeys.customers(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsCustomers({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

// Tab Advanced — pass-through murni dari RPC analytics_advanced, SAMA pola
// dengan useAnalyticsCustomersQuery di atas (selalu aktif begitu tanggal
// terisi, 1 payload gabungan seluruh metric Phase 6).
export function useAnalyticsAdvancedQuery({ fromDate, toDate, location, kode }) {
  return useQuery({
    queryKey: analyticsKeys.advanced(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsAdvanced({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

// Tab Inventory (Phase 7) — pass-through murni dari RPC
// analytics_inventory, SAMA pola dengan useAnalyticsAdvancedQuery/
// useAnalyticsProductsQuery di atas (selalu aktif begitu tanggal terisi).
export function useAnalyticsInventoryQuery({
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
  return useQuery({
    queryKey: analyticsKeys.inventory(
      fromDate, toDate, location, kode,
      lowStockCoverDays, criticalCoverDays, overstockCoverDays, deadStockDays, restockTargetDays,
    ),
    queryFn: () =>
      fetchAnalyticsInventory({
        fromDate, toDate, location, kode,
        lowStockCoverDays, criticalCoverDays, overstockCoverDays, deadStockDays, restockTargetDays,
      }),
    enabled: !!fromDate && !!toDate,
  });
}

// Tab Forecast (Phase 8) — pass-through murni dari RPC analytics_forecast,
// SAMA pola dengan useAnalyticsInventoryQuery di atas (selalu aktif begitu
// tanggal terisi).
export function useAnalyticsForecastQuery({
  fromDate,
  toDate,
  location,
  kode,
  granularity,
  alpha,
  lookbackPeriods,
  restockHorizonPeriods,
}) {
  return useQuery({
    queryKey: analyticsKeys.forecast(
      fromDate, toDate, location, kode, granularity, alpha, lookbackPeriods, restockHorizonPeriods,
    ),
    queryFn: () =>
      fetchAnalyticsForecast({
        fromDate, toDate, location, kode, granularity, alpha, lookbackPeriods, restockHorizonPeriods,
      }),
    enabled: !!fromDate && !!toDate,
  });
}

// Tab Produksi (Phase 9) — pass-through murni dari RPC analytics_production,
// SAMA pola dengan useAnalyticsInventoryQuery/useAnalyticsForecastQuery di
// atas (selalu aktif begitu tanggal terisi). TIDAK menerima `location`
// (produksi tidak punya dimensi lokasi/pasar, lihat catatan di api.js).
export function useAnalyticsProductionQuery({ fromDate, toDate, kode }) {
  return useQuery({
    queryKey: analyticsKeys.production(fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsProduction({ fromDate, toDate, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

// Tagihan jatuh tempo — DIPINDAHKAN APA ADANYA dari
// features/produksi-laporan/queries.js (useTagihanJatuhTempoQuery), hanya
// queryKey-nya yang diganti prefix "analytics" supaya konsisten dengan
// query key lain di fitur ini.
export function useTagihanJatuhTempoQuery({ fromDate, toDate }) {
  return useQuery({
    queryKey: analyticsKeys.tagihanJatuhTempo(fromDate, toDate),
    queryFn: () => fetchTagihanJatuhTempo({ fromDate, toDate }),
    enabled: !!fromDate && !!toDate,
  });
}
