import { useQuery } from "@tanstack/react-query";
import { fetchVisitStats } from "./api";
import type { DateRange } from "./schema";

export const trafikKeys = {
  stats: (range?: DateRange | null) => ["trafik-katalog", range?.start, range?.end],
};

export function useVisitStatsQuery(range?: DateRange | null) {
  return useQuery({
    queryKey: trafikKeys.stats(range),
    queryFn: () => fetchVisitStats(range!.start, range!.end),
    enabled: !!range?.start && !!range?.end,
    staleTime: 60_000,
  });
}
