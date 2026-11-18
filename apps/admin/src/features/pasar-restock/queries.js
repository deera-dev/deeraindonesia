import { useQuery } from "@tanstack/react-query";
import { fetchPasarRestock } from "./api";

export const pasarRestockKeys = {
  market: (market, target) => ["pasar-restock", market, target],
};

export function usePasarRestockQuery(market, target) {
  return useQuery({
    queryKey: pasarRestockKeys.market(market, target),
    queryFn: () => fetchPasarRestock(market, target),
    enabled: !!market,
  });
}
