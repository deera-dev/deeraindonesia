import { useInvalidateProducts, useProductsQuery } from "./queries";

export { useInvalidateProducts };

export function useProducts() {
  const { data, isLoading, error } = useProductsQuery();
  return { products: data ?? null, loading: isLoading, error };
}

export function useProduct(kode: string) {
  const { products, loading, error } = useProducts();
  const product = products?.find((p) => p.kode === kode) ?? null;
  return { product, loading, error };
}
