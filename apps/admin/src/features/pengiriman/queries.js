/**
 * features/pengiriman/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@deera/shared/features/auth/hooks";
import {
  fetchPengiriman,
  createPengiriman as createPengirimanApi,
  updatePengiriman as updatePengirimanApi,
  deletePengiriman as deletePengirimanApi,
} from "./api";

export const pengirimanKeys = {
  all: ["pengiriman"],
  list: (from, to) => ["pengiriman", from, to],
};

export function usePengirimanQuery(dateFrom = null, dateTo = null) {
  return useQuery({
    queryKey: pengirimanKeys.list(dateFrom, dateTo),
    queryFn: () => fetchPengiriman(dateFrom, dateTo),
  });
}

export function useCreatePengirimanMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createPengirimanApi({ ...payload, user }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pengirimanKeys.all }),
  });
}

export function useUpdatePengirimanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pengiriman, payload }) => updatePengirimanApi(pengiriman, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pengirimanKeys.all }),
  });
}

export function useDeletePengirimanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pengiriman) => deletePengirimanApi(pengiriman),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pengirimanKeys.all }),
  });
}
