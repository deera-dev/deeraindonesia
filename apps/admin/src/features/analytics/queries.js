import { useQuery } from "@tanstack/react-query";
import {
  fetchAnalyticsAdvanced,
  fetchAnalyticsCustomers,
  fetchAnalyticsForecast,
  fetchAnalyticsInventory,
  fetchAnalyticsMarketDetail,
  fetchAnalyticsMarkets,
  fetchAnalyticsOverview,
  fetchAnalyticsProduction,
  fetchAnalyticsProducts,
  fetchAnalyticsTrend,
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
  markets: (fromDate, toDate, kode) => ["analytics", "markets", fromDate, toDate, kode],
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
  inventory: (
    fromDate,
    toDate,
    location,
    kode,
    lowStockCoverDays,
    criticalCoverDays,
    overstockCoverDays,
    deadStockDays,
    restockTargetDays,
  ) => [
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
  forecast: (
    fromDate,
    toDate,
    location,
    kode,
    granularity,
    alpha,
    lookbackPeriods,
    restockHorizonPeriods,
  ) => [
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

export function useAnalyticsMarketsQuery({ fromDate, toDate, kode }) {
  return useQuery({
    queryKey: analyticsKeys.markets(fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsMarkets({ fromDate, toDate, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsMarketDetailQuery({ market, fromDate, toDate, kode }) {
  return useQuery({
    queryKey: analyticsKeys.marketDetail(market, fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsMarketDetail({ market, fromDate, toDate, kode }),
    enabled: !!market && !!fromDate && !!toDate,
  });
}

export function useAnalyticsCustomersQuery({ fromDate, toDate, location, kode }) {
  return useQuery({
    queryKey: analyticsKeys.customers(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsCustomers({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsAdvancedQuery({ fromDate, toDate, location, kode }) {
  return useQuery({
    queryKey: analyticsKeys.advanced(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsAdvanced({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

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
      fromDate,
      toDate,
      location,
      kode,
      lowStockCoverDays,
      criticalCoverDays,
      overstockCoverDays,
      deadStockDays,
      restockTargetDays,
    ),
    queryFn: () =>
      fetchAnalyticsInventory({
        fromDate,
        toDate,
        location,
        kode,
        lowStockCoverDays,
        criticalCoverDays,
        overstockCoverDays,
        deadStockDays,
        restockTargetDays,
      }),
    enabled: !!fromDate && !!toDate,
  });
}

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
      fromDate,
      toDate,
      location,
      kode,
      granularity,
      alpha,
      lookbackPeriods,
      restockHorizonPeriods,
    ),
    queryFn: () =>
      fetchAnalyticsForecast({
        fromDate,
        toDate,
        location,
        kode,
        granularity,
        alpha,
        lookbackPeriods,
        restockHorizonPeriods,
      }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsProductionQuery({ fromDate, toDate, kode }) {
  return useQuery({
    queryKey: analyticsKeys.production(fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsProduction({ fromDate, toDate, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useTagihanJatuhTempoQuery({ fromDate, toDate }) {
  return useQuery({
    queryKey: analyticsKeys.tagihanJatuhTempo(fromDate, toDate),
    queryFn: () => fetchTagihanJatuhTempo({ fromDate, toDate }),
    enabled: !!fromDate && !!toDate,
  });
}
