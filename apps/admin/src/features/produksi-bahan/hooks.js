/**
 * hooks.js — PUBLIC SURFACE fitur Bahan Baku.
 * Komponen HANYA boleh import dari sini (atau index.js).
 */
import { detectDupes } from "./api";
import {
  useBahanItemsQuery,
  useDeleteBahanMutation,
  useMergeDupesMutation,
  useSaveBahanMutation,
  useStokBahanQuery,
  useToggleLunasMutation,
} from "./queries";

export function useBahanItems(table) {
  const { data, isLoading } = useBahanItemsQuery(table);
  return { items: data ?? [], loading: isLoading };
}

export function useStokBahan() {
  const { data, isLoading } = useStokBahanQuery();
  return { data: data ?? [], loading: isLoading };
}

export function useSaveBahan(table) {
  const { mutateAsync } = useSaveBahanMutation(table);
  return (payload, editing, meta, activeTab) =>
    mutateAsync({ payload, editing, meta, activeTab });
}

export function useToggleLunas(table) {
  const { mutateAsync } = useToggleLunasMutation(table);
  return (item) => mutateAsync(item);
}

export function useDeleteBahan(table) {
  const { mutateAsync } = useDeleteBahanMutation(table);
  return (item, activeTab) => mutateAsync({ item, activeTab });
}

export function useMergeDupes(table) {
  const { mutateAsync } = useMergeDupesMutation(table);
  return (groups) => mutateAsync(groups);
}

// Deteksi duplikat dipanggil on-demand sekali saat modal dibuka (lihat
// MergeDupeModal) — bukan TanStack Query karena tidak perlu cache, hanya
// snapshot sekali pakai untuk preview sebelum digabung.
export { detectDupes };
