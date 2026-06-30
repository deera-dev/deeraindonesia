/**
 * hooks.js — PUBLIC SURFACE fitur Karyawan.
 * Komponen (di fitur lain maupun di sini) HANYA boleh import dari sini
 * (atau index.js) — tidak pernah dari api.js/queries.js langsung.
 */
import {
  useKaryawanAktifQuery,
  useKaryawanAllQuery,
  useSaveKaryawanMutation,
  useToggleKaryawanAktifMutation,
} from "./queries";

/** Semua karyawan (aktif & non-aktif) — dipakai oleh KaryawanPage. */
export function useKaryawanList() {
  const { data, isLoading } = useKaryawanAllQuery();
  return { karyawan: data ?? [], loading: isLoading };
}

/** Karyawan aktif saja — dipakai lintas fitur (Kasbon, Gajian). */
export function useKaryawanAktif() {
  const { data, isLoading } = useKaryawanAktifQuery();
  return { karyawan: data ?? [], loading: isLoading };
}

export function useSaveKaryawan() {
  const { mutateAsync } = useSaveKaryawanMutation();
  return (payload, editing) => mutateAsync({ payload, editing });
}

export function useToggleKaryawanAktif() {
  const { mutateAsync } = useToggleKaryawanAktifMutation();
  return (karyawan) => mutateAsync(karyawan);
}
