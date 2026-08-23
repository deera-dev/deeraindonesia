/**
 * features/produk/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateProducts } from "@deera/shared/features/products/hooks";
import {
  fetchStokMap,
  fetchStokWarnaByKode,
  fetchSalesByKode,
  fetchSoldQtyMap,
  fetchProducedByKode,
  saveProduct,
  deleteProductCascade,
} from "./api";

export const produkKeys = {
  stokMap: ["produk", "stok-map"],
  stokWarna: (kode) => ["produk", "stok-warna", kode],
  salesByKode: (kode) => ["produk", "sales", kode],
  soldQtyMap: ["produk", "sold-qty-map"],
  producedByKode: (kode) => ["produk", "produced", kode],
};

export function useStokMapQuery() {
  return useQuery({ queryKey: produkKeys.stokMap, queryFn: fetchStokMap });
}

export function useStokWarnaByKodeQuery(kode, { enabled = true } = {}) {
  return useQuery({
    queryKey: produkKeys.stokWarna(kode),
    queryFn: () => fetchStokWarnaByKode(kode),
    enabled: enabled && !!kode,
  });
}

export function useSalesByKodeQuery(kode) {
  return useQuery({
    queryKey: produkKeys.salesByKode(kode),
    queryFn: () => fetchSalesByKode(kode),
    enabled: !!kode,
  });
}

export function useSoldQtyMapQuery() {
  return useQuery({ queryKey: produkKeys.soldQtyMap, queryFn: fetchSoldQtyMap });
}

export function useProducedByKodeQuery(kode) {
  return useQuery({
    queryKey: produkKeys.producedByKode(kode),
    queryFn: () => fetchProducedByKode(kode),
    enabled: !!kode,
  });
}

function invalidateProdukQueries(queryClient, invalidateProducts) {
  invalidateProducts();
  queryClient.invalidateQueries({ queryKey: produkKeys.stokMap });
}

export function useSaveProductMutation() {
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload) => saveProduct(payload),
    onSuccess: () => invalidateProdukQueries(queryClient, invalidateProducts),
  });
}

export function useDeleteProductCascadeMutation() {
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateProducts();
  return useMutation({
    mutationFn: (kode) => deleteProductCascade(kode),
    onSuccess: () => invalidateProdukQueries(queryClient, invalidateProducts),
  });
}
