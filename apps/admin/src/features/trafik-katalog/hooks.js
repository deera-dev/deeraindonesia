import { useVisitStatsQuery } from "./queries";

export function useVisitStats(days) {
  const q = useVisitStatsQuery(days);
  return { stats: q.data ?? null, loading: q.isLoading, error: q.error };
}
export { PERIODS, channelLabel, channelColor, sourceLabel, pct, dailyBars, fmtDay } from "./utils";
