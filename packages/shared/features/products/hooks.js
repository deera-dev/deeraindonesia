/**
 * features/products/hooks.js
 * PUBLIC SURFACE fitur products — komponen HANYA boleh import dari sini.
 * Bentuk return useProducts()/useProduct() SAMA seperti versi module-cache lama
 * agar semua consumer existing cukup ganti import path, tanpa ubah call-site.
 */
import { useProductsQuery, useInvalidateProducts } from "./queries";

export { useInvalidateProducts };

export function useProducts() {
  const { data, isLoading, error } = useProductsQuery();
  return { products: data ?? null, loading: isLoading, error };
}

// Single product (by kode)
export function useProduct(kode) {
  const { products, loading, error } = useProducts();
  const product = products?.find((p) => p.kode === kode) ?? null;
  return { product, loading, error };
}
