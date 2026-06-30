/**
 * queries.js — useQuery/useMutation wrappers fitur Kas.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteKas, fetchKas, fetchKasBulanIni, saveKas } from "./api";

export const kasKeys = {
  list: (filterBulan, filterJenis) => ["kas", "list", filterBulan, filterJenis],
  bulanIni: (bulanAwalStr) => ["kas", "bulan-ini", bulanAwalStr],
};

export function useKasListQuery(filterBulan, filterJenis) {
  return useQuery({
    queryKey: kasKeys.list(filterBulan, filterJenis),
    queryFn: () => fetchKas({ filterBulan, filterJenis }),
  });
}

export function useKasBulanIniQuery(bulanAwalStr) {
  return useQuery({
    queryKey: kasKeys.bulanIni(bulanAwalStr),
    queryFn: () => fetchKasBulanIni(bulanAwalStr),
  });
}

function invalidateKas(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["kas"] });
}

export function useSaveKasMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, editing }) => saveKas({ payload, editing }),
    onSuccess: () => invalidateKas(queryClient),
  });
}

export function useDeleteKasMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteKas(id),
    onSuccess: () => invalidateKas(queryClient),
  });
}
