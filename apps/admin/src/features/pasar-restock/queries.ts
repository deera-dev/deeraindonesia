import { useQuery } from "@tanstack/react-query";
import { fetchPasarRestock } from "./api";

export const pasarRestockKeys = {
  market: (market: string | null | undefined, target: number) => ["pasar-restock", market, target],
};

export function usePasarRestockQuery(market: string | null | undefined, target: number) {
  return useQuery({
    queryKey: pasarRestockKeys.market(market, target),
    queryFn: () => fetchPasarRestock(market, target),
    enabled: !!market,
  });
}
