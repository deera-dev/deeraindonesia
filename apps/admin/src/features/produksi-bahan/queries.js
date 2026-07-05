/**
 * queries.js — useQuery/useMutation wrapper di atas api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBahanItem,
  fetchBahanItems,
  fetchStokBahan,
  mergeDupeGroups,
  saveBahanItem,
  toggleLunas,
} from "./api";

export const produksiBahanKeys = {
  items: (table) => ["produksi-bahan", "items", table],
  stok: ["produksi-bahan", "stok"],
};

export function useBahanItemsQuery(table) {
  return useQuery({
    queryKey: produksiBahanKeys.items(table),
    queryFn: () => fetchBahanItems(table),
  });
}

export function useStokBahanQuery() {
  return useQuery({
    queryKey: produksiBahanKeys.stok,
    queryFn: fetchStokBahan,
  });
}

export function useSaveBahanMutation(table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args) => saveBahanItem({ table, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}

export function useToggleLunasMutation(table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item) => toggleLunas(table, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}

export function useDeleteBahanMutation(table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args) => deleteBahanItem({ table, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}

export function useMergeDupesMutation(table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groups) => mergeDupeGroups(table, groups),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}
