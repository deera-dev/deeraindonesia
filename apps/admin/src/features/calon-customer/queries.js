/**
 * features/calon-customer/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCalonCustomerList,
  createCalonCustomer,
  updateCalonCustomer,
  deleteCalonCustomer,
} from "./api";

export const calonCustomerKeys = {
  list: ["calon-customer", "list"],
};

export function useCalonCustomerListQuery() {
  return useQuery({ queryKey: calonCustomerKeys.list, queryFn: fetchCalonCustomerList });
}

export function useCreateCalonCustomerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCalonCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: calonCustomerKeys.list }),
  });
}

export function useUpdateCalonCustomerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateCalonCustomer(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: calonCustomerKeys.list }),
  });
}

export function useDeleteCalonCustomerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCalonCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: calonCustomerKeys.list }),
  });
}
