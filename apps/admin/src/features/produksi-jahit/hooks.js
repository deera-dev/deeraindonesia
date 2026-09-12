/**
 * hooks.js — PUBLIC SURFACE fitur produksi-jahit.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion).
 */
import {
  useAssignKaryawanMutation,
  useCreateJahitCardsForBatchMutation,
  useDoneJahitCardsQuery,
  useJahitCardsQuery,
  useKaryawanJahitQuery,
  useMarkCardDoneMutation,
  useMoveBackToProgressMutation,
  useMoveToReadyFinishingMutation,
  useUnassignCardMutation,
} from "./queries";

export function useJahitCards() {
  const { data, isLoading } = useJahitCardsQuery();
  return { cards: data ?? [], loading: isLoading };
}

// filter: { dateFrom, dateTo, search }. enabled: kontrol dari komponen
// (JahitDoneSection) — true hanya saat accordion arsip terbuka.
export function useDoneJahitCards(filter, enabled) {
  const { data, isLoading } = useDoneJahitCardsQuery(filter, enabled);
  return { cards: data ?? [], loading: isLoading };
}

export function useMarkCardDone() {
  const { mutateAsync } = useMarkCardDoneMutation();
  return (params) => mutateAsync(params);
}

export function useKaryawanJahit() {
  const { data, isLoading } = useKaryawanJahitQuery();
  return { karyawanList: data ?? [], loading: isLoading };
}

// Dipanggil dari features/produksi-record/api.js (layer api → api, BUKAN
// lewat hook ini — lihat createJahitCardsForBatch di ./api.js). Hook ini
// disediakan untuk pemanggilan dari KOMPONEN di fitur ini sendiri, kalau
// suatu saat perlu (mis. tombol "Sinkronkan ulang kartu" manual).
export function useCreateJahitCardsForBatch() {
  const { mutateAsync } = useCreateJahitCardsForBatchMutation();
  return (params) => mutateAsync(params);
}

export function useAssignKaryawan() {
  const { mutateAsync, isPending } = useAssignKaryawanMutation();
  return { assign: (params) => mutateAsync(params), assigning: isPending };
}

export function useMoveToReadyFinishing() {
  const { mutateAsync } = useMoveToReadyFinishingMutation();
  return (params) => mutateAsync(params);
}

export function useUnassignCard() {
  const { mutateAsync } = useUnassignCardMutation();
  return (params) => mutateAsync(params);
}

export function useMoveBackToProgress() {
  const { mutateAsync } = useMoveBackToProgressMutation();
  return (params) => mutateAsync(params);
}
