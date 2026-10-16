import { useQuery } from "@tanstack/react-query";
import { fetchVisitStats } from "./api";

export const trafikKeys = { stats: (days) => ["trafik-katalog", days] };

export function useVisitStatsQuery(days) {
  return useQuery({ queryKey: trafikKeys.stats(days), queryFn: () => fetchVisitStats(days), staleTime: 60_000 });
}
