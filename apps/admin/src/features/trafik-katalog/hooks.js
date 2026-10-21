import { useVisitStatsQuery } from "./queries";

export function useVisitStats(range) {
  const q = useVisitStatsQuery(range);
  return { stats: q.data ?? null, loading: q.isLoading, error: q.error };
}
export { PERIODS, channelLabel, channelColor, sourceLabel, pct, dailyBars, fmtDay, localDateStr, rangeForPreset, clampRange, INTERNAL_MARK_URL } from "./utils";
