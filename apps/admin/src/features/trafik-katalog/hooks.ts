import { useVisitStatsQuery } from "./queries";
import type { DateRange } from "./schema";

export function useVisitStats(range?: DateRange | null) {
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
  locationLabel,
  PERIODS,
  pct,
  rangeForPreset,
  sourceLabel,
} from "./utils";
