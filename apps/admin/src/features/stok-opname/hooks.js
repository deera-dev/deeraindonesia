/**
 * features/stok-opname/hooks.js
 * PUBLIC SURFACE fitur stok-opname — komponen HANYA boleh import dari sini.
 */
import { useStokWarnaAllQuery, useSaveStokOpnameMutation } from "./queries";
import { useStokOpnameDraftStore } from "./store";

export function useStokWarnaAll() {
  const { data, isLoading } = useStokWarnaAllQuery();
  return { stokRows: data ?? [], loading: isLoading };
}

export function useSaveStokOpname() {
  const { mutateAsync } = useSaveStokOpnameMutation();
  return (vars) => mutateAsync(vars);
}

export function useStokOpnameDraft() {
  const changed = useStokOpnameDraftStore((s) => s.changed);
  const setValue = useStokOpnameDraftStore((s) => s.setValue);
  const clear = useStokOpnameDraftStore((s) => s.clear);
  return { changed, setValue, clear };
}

// Dicek sekali saat mount (di luar render reaktif) untuk tahu apakah draft
// yang tampil berasal dari sesi sebelumnya (localStorage), bukan baru diisi.
export function hasPersistedDraft() {
  return Object.keys(useStokOpnameDraftStore.getState().changed).length > 0;
}
