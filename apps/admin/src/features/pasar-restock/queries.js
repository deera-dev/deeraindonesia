/**
 * queries.js — Wrapper TanStack Query (useQuery) untuk fitur pasar-restock.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchStokAll, fetchSoldKodesAtLocation, fetchProduksiBatches } from "./api";
import { buildProduksiInfo } from "./utils";

export const pasarRestockKeys = {
  stok: ["pasar-restock", "stok"],
  produksi: ["pasar-restock", "produksi"],
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

export function useProduksiInfoQuery() {
  return useQuery({
    queryKey: pasarRestockKeys.produksi,
    queryFn: async () => buildProduksiInfo(await fetchProduksiBatches()),
  });
}
