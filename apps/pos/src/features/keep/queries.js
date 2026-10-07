/**
 * features/keep/queries.js — TanStack Query membungkus api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKeepOrders, createKeepOrder, markKeepPaid, cancelKeep } from "./api";

export const keepKeys = { aktif: ["keep", "aktif"] };

export function useKeepOrdersQuery() {
  return useQuery({ queryKey: keepKeys.aktif, queryFn: fetchKeepOrders });
}

function useInvalidating(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: keepKeys.aktif }) });
}

export const useCreateKeepMutation = () => useInvalidating(createKeepOrder);
export const useMarkKeepPaidMutation = () => useInvalidating(markKeepPaid);
export const useCancelKeepMutation = () => useInvalidating(cancelKeep);
