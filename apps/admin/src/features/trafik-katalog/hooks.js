import { useVisitStatsQuery } from "./queries";

export function useVisitStats(range) {
  const q = useVisitStatsQuery(range);
  return { stats: q.data ?? null, loading: q.isLoading, error: q.error };
}
export {
  channelColor,
  channelLabel,
  clampRange,
  dailyBars,
  fmtDay,
  INTERNAL_MARK_URL,
  localDateStr,
  PERIODS,
  pct,
  rangeForPreset,
  sourceLabel,
} from "./utils";
