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

export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all });
}
