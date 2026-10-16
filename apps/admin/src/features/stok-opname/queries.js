/**
 * features/stok-opname/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllStokWarna, fetchJahitDikerjakan, saveStokOpname, planOpnameOverflow, checkStokSemua, fetchBukuPotongan } from "./api";

export const stokOpnameKeys = {
  all: ["stok-opname", "stok-warna"],
  jahitDikerjakan: ["stok-opname", "jahit-dikerjakan"],
  bukuPotongan: ["stok-opname", "buku-potongan"],
};

export function useStokWarnaAllQuery() {
  return useQuery({
    queryKey: stokOpnameKeys.all,
    queryFn: fetchAllStokWarna,
  });
}

export function useJahitDikerjakanQuery() {
  return useQuery({
    queryKey: stokOpnameKeys.jahitDikerjakan,
    queryFn: fetchJahitDikerjakan,
  });
}

export function useBukuPotonganQuery() {
  return useQuery({ queryKey: stokOpnameKeys.bukuPotongan, queryFn: fetchBukuPotongan });
}

export function useSaveStokOpnameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => saveStokOpname(vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stokOpnameKeys.all }),
  });
}

export function usePlanOpnameOverflowMutation() {
  return useMutation({ mutationFn: planOpnameOverflow });
}

export function useCheckStokSemuaMutation() {
  return useMutation({ mutationFn: checkStokSemua });
}
