import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "./api";

export const productKeys = {
  all: ["catalog-products-public"],
};

export function useProductsQuery() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: fetchProducts,
  });
}
