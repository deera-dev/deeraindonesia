import { useQuery } from "@tanstack/react-query";
import { fetchSalesByBuyerName, fetchSalesByPelanggan } from "./api";

export const pelangganKeys = {
  salesByPelanggan: (id) => ["pelanggan-pos", "sales", id],
  salesByBuyerName: (nama) => ["pelanggan-pos", "sales-by-name", nama],
};

export function useSalesByPelangganQuery(pelangganId) {
  return useQuery({
    queryKey: pelangganKeys.salesByPelanggan(pelangganId),
    queryFn: () => fetchSalesByPelanggan(pelangganId),
    enabled: !!pelangganId,
  });
}

export function useSalesByBuyerNameQuery(buyerName) {
  return useQuery({
    queryKey: pelangganKeys.salesByBuyerName(buyerName),
    queryFn: () => fetchSalesByBuyerName(buyerName),
    enabled: !!buyerName,
  });
}
