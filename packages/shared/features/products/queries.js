/**
 * features/products/queries.js
 * TanStack Query hooks — menggantikan module-level cache manual yang lama.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts } from "./api";

export const productKeys = {
  all: ["products"],
};

export function useProductsQuery() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: fetchProducts,
  });
}

// Dipanggil di top-level komponen (bukan di dalam handler) — hasilnya (function)
// baru dipanggil di dalam handler setelah mutasi produk sukses.
// Mis: const invalidateProducts = useInvalidateProducts(); ...lalu di handler: invalidateProducts();
export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all });
}
