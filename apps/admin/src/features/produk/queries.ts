import { useInvalidateProducts } from "@deera/shared/features/products/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProductCascade,
  fetchDikirimByKode,
  fetchProducedByKode,
  fetchProductAchievements,
  fetchProductBadgeHistory,
  fetchProductBadgeReason,
  fetchProductBadges,
  fetchProductPriceHistory,
  fetchSalesByKode,
  fetchSalesDetailByKode,
  fetchSoldQtyMap,
  fetchStokMap,
  fetchStokWarnaByKode,
  saveProduct,
} from "./api";
import type { SaveProductParams } from "./schema";

export const produkKeys = {
  stokMap: ["produk", "stok-map"],
  stokWarna: (kode: string) => ["produk", "stok-warna", kode],
  salesByKode: (kode: string) => ["produk", "sales", kode],
  dikirimByKode: (kode: string) => ["produk", "dikirim", kode],
  salesDetailByKode: (kode: string) => ["produk", "sales-detail", kode],
  soldQtyMap: ["produk", "sold-qty-map"],
  producedByKode: (kode: string) => ["produk", "produced", kode],
};

export function useStokMapQuery() {
  return useQuery({ queryKey: produkKeys.stokMap, queryFn: fetchStokMap });
}

export function useStokWarnaByKodeQuery(kode: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: produkKeys.stokWarna(kode),
    queryFn: () => fetchStokWarnaByKode(kode),
    enabled: enabled && !!kode,
  });
}

export function useSalesByKodeQuery(kode: string) {
  return useQuery({
    queryKey: produkKeys.salesByKode(kode),
    queryFn: () => fetchSalesByKode(kode),
    enabled: !!kode,
  });
}

export function useDikirimByKodeQuery(kode: string) {
  return useQuery({
    queryKey: produkKeys.dikirimByKode(kode),
    queryFn: () => fetchDikirimByKode(kode),
    enabled: !!kode,
  });
}

export function useSalesDetailByKodeQuery(kode: string) {
  return useQuery({
    queryKey: produkKeys.salesDetailByKode(kode),
    queryFn: () => fetchSalesDetailByKode(kode),
    enabled: !!kode,
  });
}

export function useProductBadgesQuery(days = 30) {
  return useQuery({
    queryKey: ["produk", "badges", days],
    queryFn: () => fetchProductBadges(days),
    staleTime: 60_000,
  });
}

export function useProductBadgeHistoryQuery(kode: string) {
  return useQuery({
    queryKey: ["produk", "badge-history", kode],
    queryFn: () => fetchProductBadgeHistory(kode),
    enabled: !!kode,
    staleTime: 60_000,
  });
}

export function useProductBadgeReasonQuery(kode: string, enabled = true) {
  return useQuery({
    queryKey: ["produk", "badge-reason", kode],
    queryFn: () => fetchProductBadgeReason(kode),
    enabled: !!kode && enabled,
    staleTime: 60_000,
  });
}

export function useProductAchievementsQuery(kode: string) {
  return useQuery({
    queryKey: ["produk", "achievements", kode],
    queryFn: () => fetchProductAchievements(kode),
    enabled: !!kode,
    staleTime: 5 * 60_000,
  });
}

export function useProductPriceHistoryQuery(kode: string) {
  return useQuery({
    queryKey: ["produk", "price-history", kode],
    queryFn: () => fetchProductPriceHistory(kode),
    enabled: !!kode,
    staleTime: 30_000,
  });
}

export function useSoldQtyMapQuery() {
  return useQuery({ queryKey: produkKeys.soldQtyMap, queryFn: fetchSoldQtyMap });
}

export function useProducedByKodeQuery(kode: string) {
  return useQuery({
    queryKey: produkKeys.producedByKode(kode),
    queryFn: () => fetchProducedByKode(kode),
    enabled: !!kode,
  });
}

function invalidateProdukQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  invalidateProducts: () => void,
) {
  invalidateProducts();
  queryClient.invalidateQueries({ queryKey: produkKeys.stokMap });
}

export function useSaveProductMutation() {
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload: SaveProductParams) => saveProduct(payload),
    onSuccess: () => invalidateProdukQueries(queryClient, invalidateProducts),
  });
}

export function useDeleteProductCascadeMutation() {
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateProducts();
  return useMutation({
    mutationFn: (kode: string) => deleteProductCascade(kode),
    onSuccess: () => invalidateProdukQueries(queryClient, invalidateProducts),
  });
}
