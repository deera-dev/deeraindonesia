import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBukuPotonganData, upsertExpectedStok } from "./api";
import type { ExpectedStokRow } from "./schema";

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
    mutationFn: (rows: ExpectedStokRow[]) => upsertExpectedStok(rows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bukuPotonganKeys.all }),
  });
}
