/**
 * hooks.js — PUBLIC SURFACE fitur Kas.
 * Komponen HANYA boleh import dari sini (atau index.js).
 */
import {
  useDeleteKasMutation,
  useKasBulanIniQuery,
  useKasListQuery,
  useSaveKasMutation,
} from "./queries";

export function useKasList(filterBulan, filterJenis) {
  const { data, isLoading, error } = useKasListQuery(filterBulan, filterJenis);
  return { rows: data ?? [], loading: isLoading, loadError: error?.message ?? null };
}

/** Ringkasan kas bulan berjalan — dipakai DashboardPage. */
export function useKasBulanIni(bulanAwalStr) {
  const { data, isLoading } = useKasBulanIniQuery(bulanAwalStr);
  return { kasMasuk: data?.kasMasuk ?? 0, kasKeluar: data?.kasKeluar ?? 0, loading: isLoading };
}

export function useSaveKas() {
  const { mutateAsync } = useSaveKasMutation();
  return (payload, editing) => mutateAsync({ payload, editing });
}

export function useDeleteKas() {
  const { mutateAsync } = useDeleteKasMutation();
  return (id) => mutateAsync(id);
}
