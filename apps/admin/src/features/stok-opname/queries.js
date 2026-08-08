/**
 * features/stok-opname/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllStokWarna, fetchJahitDikerjakan, saveStokOpname } from "./api";

export const stokOpnameKeys = {
  all: ["stok-opname", "stok-warna"],
  jahitDikerjakan: ["stok-opname", "jahit-dikerjakan"],
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

export function useSaveStokOpnameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => saveStokOpname(vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stokOpnameKeys.all }),
  });
}
