import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCalonCustomer,
  deleteCalonCustomer,
  fetchCalonCustomerList,
  updateCalonCustomer,
} from "./api";
import type { CalonCustomerPatch } from "./schema";

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
    mutationFn: ({ id, patch }: { id: string; patch: CalonCustomerPatch }) =>
      updateCalonCustomer(id, patch),
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
