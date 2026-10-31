import {
  useKaryawanAktifQuery,
  useKaryawanAllQuery,
  useSaveKaryawanMutation,
  useToggleKaryawanAktifMutation,
} from "./queries";

export function useKaryawanList() {
  const { data, isLoading } = useKaryawanAllQuery();
  return { karyawan: data ?? [], loading: isLoading };
}

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
