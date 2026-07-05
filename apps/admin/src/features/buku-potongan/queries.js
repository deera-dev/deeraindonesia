/**
 * features/buku-potongan/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBukuPotonganData, upsertExpectedStok } from "./api";

export const bukuPotonganKeys = {
  all: ["buku-potongan"],
};

export function useBukuPotonganDataQuery() {
  return useQuery({
    queryKey: bukuPotonganKeys.all,
    queryFn: fetchBukuPotonganData,
  });
}

export function useUpsertExpectedStokMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows) => upsertExpectedStok(rows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bukuPotonganKeys.all }),
  });
}
