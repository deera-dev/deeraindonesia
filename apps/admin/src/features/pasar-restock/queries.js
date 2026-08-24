/**
 * queries.js — Wrapper TanStack Query (useQuery) untuk fitur pasar-restock.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchStokAll, fetchSoldKodesAtLocation } from "./api";

export const pasarRestockKeys = {
  stok: ["pasar-restock", "stok"],
  soldKodes: (location, sinceDateStr) => ["pasar-restock", "sold-kodes", location, sinceDateStr],
};

export function useStokAllQuery() {
  return useQuery({ queryKey: pasarRestockKeys.stok, queryFn: fetchStokAll });
}

export function useSoldKodesQuery(location, sinceDateStr) {
  return useQuery({
    queryKey: pasarRestockKeys.soldKodes(location, sinceDateStr),
    queryFn: () => fetchSoldKodesAtLocation(location, sinceDateStr),
    enabled: !!location && !!sinceDateStr,
  });
}
