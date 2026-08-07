/**
 * features/pelanggan/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchPelangganList, fetchSalesByPelanggan } from "./api";

export const pelangganKeys = {
  list: ["pelanggan", "list"],
  salesByPelanggan: (id) => ["pelanggan", "sales", id],
};

export function usePelangganListQuery() {
  return useQuery({ queryKey: pelangganKeys.list, queryFn: fetchPelangganList });
}

export function useSalesByPelangganQuery(pelangganId) {
  return useQuery({
    queryKey: pelangganKeys.salesByPelanggan(pelangganId),
    queryFn: () => fetchSalesByPelanggan(pelangganId),
    enabled: !!pelangganId,
  });
}
