/**
 * queries.js — Wrapper TanStack Query (useQuery) untuk fitur pasar-restock.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchPasarRestock } from "./api";

export const pasarRestockKeys = {
  market: (market) => ["pasar-restock", market],
};

export function usePasarRestockQuery(market) {
  return useQuery({
    queryKey: pasarRestockKeys.market(market),
    queryFn: () => fetchPasarRestock(market),
    enabled: !!market,
  });
}
