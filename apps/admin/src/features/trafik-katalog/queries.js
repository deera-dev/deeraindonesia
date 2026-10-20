import { useQuery } from "@tanstack/react-query";
import { fetchVisitStats } from "./api";

export const trafikKeys = { stats: (range) => ["trafik-katalog", range?.start, range?.end] };

export function useVisitStatsQuery(range) {
  return useQuery({
    queryKey: trafikKeys.stats(range),
    queryFn: () => fetchVisitStats(range.start, range.end),
    enabled: !!range?.start && !!range?.end,
    staleTime: 60_000,
  });
}
