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

// Invalidasi cache Stok Bahan dari fitur LAIN (produksi-record) setelah
// batch produksi dibuat/diedit/dihapus/disinkronkan — v_stok_bahan (kolom
// Keluar) bergantung pada produksi_batch.bahan_dipakai, tapi query key-nya
// beda namespace dari produksi-record sehingga TanStack Query tidak tahu
// harus refetch tanpa invalidasi eksplisit ini. Pola sama seperti
// useInvalidateProducts di @deera/shared/features/products/hooks.
export function useInvalidateStokBahan() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: produksiBahanKeys.stok });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bahan", table] }),
  });
}
