/**
 * features/analytics/index.js — barrel export untuk App.jsx.
 * Phase 1: AnalyticsPage (Overview + Trends). Phase 2 menambah tab
 * Products. Phase 3 menambah tab Markets. Phase 4 menambah tab Customers.
 */
export { default as AnalyticsPage } from "./components/AnalyticsPage";
export {
  useAnalyticsFilter,
  useAnalyticsOverview,
  useAnalyticsTrend,
  useAnalyticsProducts,
  useAnalyticsMarkets,
  useAnalyticsMarketDetail,
  useAnalyticsCustomers,
} from "./hooks";
