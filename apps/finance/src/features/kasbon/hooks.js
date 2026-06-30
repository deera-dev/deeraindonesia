/**
 * hooks.js — PUBLIC SURFACE fitur Kasbon.
 * Komponen (termasuk konsumen cross-feature seperti features/gajian) HANYA
 * boleh import dari sini (atau index.js).
 */
import {
  useApplyKasbonDeductionMutation,
  useCreateOrAccumulateKasbonMutation,
  useDeleteKasbonMutation,
  useKasbonAllQuery,
  useKasbonBelumLunasByKaryawanIdsQuery,
  usePayCicilanMutation,
  useUpdateKasbonJumlahMutation,
} from "./queries";

export function useKasbonList() {
  const { data, isLoading, error } = useKasbonAllQuery();
  return { rows: data ?? [], loading: isLoading, loadError: error?.message ?? null };
}

/** Dipakai features/gajian (TabRingkasan) — kasbon belum lunas milik daftar karyawan_id. */
export function useKasbonBelumLunasByKaryawanIds(ids) {
  const { data, isLoading } = useKasbonBelumLunasByKaryawanIdsQuery(ids);
  return { kasbon: data ?? [], loading: isLoading };
}

export function useCreateOrAccumulateKasbon() {
  const { mutateAsync } = useCreateOrAccumulateKasbonMutation();
  return (args) => mutateAsync(args);
}

export function useUpdateKasbonJumlah() {
  const { mutateAsync } = useUpdateKasbonJumlahMutation();
  return (args) => mutateAsync(args);
}

export function useDeleteKasbon() {
  const { mutateAsync } = useDeleteKasbonMutation();
  return (id) => mutateAsync(id);
}

export function usePayCicilan() {
  const { mutateAsync } = usePayCicilanMutation();
  return (args) => mutateAsync(args);
}

/** Dipakai features/gajian (handleFinalize) untuk memotong kasbon sebagai cicilan. */
export function useApplyKasbonDeduction() {
  const { mutateAsync } = useApplyKasbonDeductionMutation();
  return (kasbonRow, { jumlah, tanggal, keterangan }) =>
    mutateAsync({ kasbonRow, jumlah, tanggal, keterangan });
}
