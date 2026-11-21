import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPengiriman as createPengirimanApi,
  deletePengiriman as deletePengirimanApi,
  fetchPengiriman,
  updatePengiriman as updatePengirimanApi,
} from "./api";
import type { PengirimanFormPayload } from "./schema";

export const pengirimanKeys = {
  all: ["pengiriman"],
  list: (from: string | null, to: string | null) => ["pengiriman", from, to],
};

export function usePengirimanQuery(dateFrom: string | null = null, dateTo: string | null = null) {
  return useQuery({
    queryKey: pengirimanKeys.list(dateFrom, dateTo),
    queryFn: () => fetchPengiriman(dateFrom, dateTo),
  });
}

export function useCreatePengirimanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PengirimanFormPayload) => createPengirimanApi(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pengirimanKeys.all }),
  });
}

export function useUpdatePengirimanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pengiriman,
      payload,
    }: {
      pengiriman: { id: string };
      payload: PengirimanFormPayload;
    }) => updatePengirimanApi(pengiriman, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pengirimanKeys.all }),
  });
}

export function useDeletePengirimanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pengiriman: { id: string }) => deletePengirimanApi(pengiriman),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pengirimanKeys.all }),
  });
}
