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
  overview: (
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
  ) => ["analytics", "overview", fromDate, toDate, location, kode],
  trend: (
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
    granularity: string | undefined,
  ) => ["analytics", "trend", fromDate, toDate, location, kode, granularity],
  products: (
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
    lowStockCoverDays: number | undefined,
  ) => ["analytics", "products", fromDate, toDate, location, kode, lowStockCoverDays],
  markets: (fromDate: string, toDate: string, kode: string | null | undefined) => [
    "analytics",
    "markets",
    fromDate,
    toDate,
    kode,
  ],
  marketDetail: (
    market: string | null | undefined,
    fromDate: string,
    toDate: string,
    kode: string | null | undefined,
  ) => ["analytics", "marketDetail", market, fromDate, toDate, kode],
  customers: (
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
  ) => ["analytics", "customers", fromDate, toDate, location, kode],
  advanced: (
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
  ) => ["analytics", "advanced", fromDate, toDate, location, kode],
  inventory: (
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
    lowStockCoverDays: number | undefined,
    criticalCoverDays: number | undefined,
    overstockCoverDays: number | undefined,
    deadStockDays: number | undefined,
    restockTargetDays: number | undefined,
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
    fromDate: string,
    toDate: string,
    location: string | null | undefined,
    kode: string | null | undefined,
    granularity: string | undefined,
    alpha: number | undefined,
    lookbackPeriods: number | undefined,
    restockHorizonPeriods: number | undefined,
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
  production: (fromDate: string, toDate: string, kode: string | null | undefined) => [
    "analytics",
    "production",
    fromDate,
    toDate,
    kode,
  ],
  tagihanJatuhTempo: (fromDate: string, toDate: string) => [
    "analytics",
    "tagihanJatuhTempo",
    fromDate,
    toDate,
  ],
};

export function useAnalyticsOverviewQuery({
  fromDate,
  toDate,
  location,
  kode,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
}) {
  return useQuery({
    queryKey: analyticsKeys.overview(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsOverview({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsTrendQuery({
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
}) {
  return useQuery({
    queryKey: analyticsKeys.trend(fromDate, toDate, location, kode, granularity),
    queryFn: () => fetchAnalyticsTrend({ fromDate, toDate, location, kode, granularity }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsProductsQuery({
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
}) {
  return useQuery({
    queryKey: analyticsKeys.products(fromDate, toDate, location, kode, lowStockCoverDays),
    queryFn: () => fetchAnalyticsProducts({ fromDate, toDate, location, kode, lowStockCoverDays }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsMarketsQuery({
  fromDate,
  toDate,
  kode,
}: {
  fromDate: string;
  toDate: string;
  kode?: string | null;
}) {
  return useQuery({
    queryKey: analyticsKeys.markets(fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsMarkets({ fromDate, toDate, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsMarketDetailQuery({
  market,
  fromDate,
  toDate,
  kode,
}: {
  market: string | null | undefined;
  fromDate: string;
  toDate: string;
  kode?: string | null;
}) {
  return useQuery({
    queryKey: analyticsKeys.marketDetail(market, fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsMarketDetail({ market: market!, fromDate, toDate, kode }),
    enabled: !!market && !!fromDate && !!toDate,
  });
}

export function useAnalyticsCustomersQuery({
  fromDate,
  toDate,
  location,
  kode,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
}) {
  return useQuery({
    queryKey: analyticsKeys.customers(fromDate, toDate, location, kode),
    queryFn: () => fetchAnalyticsCustomers({ fromDate, toDate, location, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useAnalyticsAdvancedQuery({
  fromDate,
  toDate,
  location,
  kode,
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
}) {
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
}: {
  fromDate: string;
  toDate: string;
  location?: string | null;
  kode?: string | null;
  granularity?: string;
  alpha?: number;
  lookbackPeriods?: number;
  restockHorizonPeriods?: number;
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

export function useAnalyticsProductionQuery({
  fromDate,
  toDate,
  kode,
}: {
  fromDate: string;
  toDate: string;
  kode?: string | null;
}) {
  return useQuery({
    queryKey: analyticsKeys.production(fromDate, toDate, kode),
    queryFn: () => fetchAnalyticsProduction({ fromDate, toDate, kode }),
    enabled: !!fromDate && !!toDate,
  });
}

export function useTagihanJatuhTempoQuery({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.tagihanJatuhTempo(fromDate, toDate),
    queryFn: () => fetchTagihanJatuhTempo({ fromDate, toDate }),
    enabled: !!fromDate && !!toDate,
  });
}
