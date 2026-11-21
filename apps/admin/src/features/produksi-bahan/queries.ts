import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBahanItem,
  fetchBahanItems,
  fetchStokBahan,
  mergeDupeGroups,
  saveBahanItem,
  toggleLunas,
} from "./api";
import type {
  BahanItemRow,
  BahanTable,
  DeleteBahanItemArgs,
  DupeGroup,
  SaveBahanItemArgs,
} from "./schema";

export const produksiBahanKeys = {
  items: (table: BahanTable) => ["produksi-bahan", "items", table],
  stok: ["produksi-bahan", "stok"],
};

export function useBahanItemsQuery(table: BahanTable) {
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

export function useInvalidateStokBahan() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: produksiBahanKeys.stok });
}

export function useSaveBahanMutation(table: BahanTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: Omit<SaveBahanItemArgs, "table">) => saveBahanItem({ table, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}

export function useToggleLunasMutation(table: BahanTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: BahanItemRow) => toggleLunas(table, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}

export function useDeleteBahanMutation(table: BahanTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: Omit<DeleteBahanItemArgs, "table">) => deleteBahanItem({ table, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiBahanKeys.items(table) }),
  });
}

export function useMergeDupesMutation(table: BahanTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groups: DupeGroup[]) => mergeDupeGroups(table, groups),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bahan", table] }),
  });
}
