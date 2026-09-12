/**
 * queries.js — Wrapper TanStack Query (useQuery/useMutation) untuk fitur
 * produksi-jahit.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignKaryawan,
  createJahitCardsForBatch,
  fetchDoneJahitCards,
  fetchJahitCards,
  fetchKaryawanJahit,
  markCardDone,
  moveBackToProgress,
  moveToReadyFinishing,
  unassignCard,
} from "./api";

export const jahitCardsKeys = { all: ["jahit-cards"] };
export const karyawanJahitKeys = { all: ["karyawan-jahit"] };
// Key ikut sertakan filter — kombinasi tanggal/search beda dianggap query
// beda, cache masing-masing terpisah (pola sama seperti sampelCommentsKeys
// yang parametrized di produksi-sampel/queries.js).
export const doneJahitCardsKeys = {
  filtered: (filter) => ["jahit-cards-done", filter],
};

export function useJahitCardsQuery() {
  return useQuery({ queryKey: jahitCardsKeys.all, queryFn: fetchJahitCards });
}

// enabled: false selama accordion arsip belum dibuka (JahitDoneSection) —
// supaya kunjungan biasa ke halaman ini tidak ikut menarik data arsip yang
// terus bertambah kalau admin tidak membukanya.
export function useDoneJahitCardsQuery(filter, enabled) {
  return useQuery({
    queryKey: doneJahitCardsKeys.filtered(filter),
    queryFn: () => fetchDoneJahitCards(filter),
    enabled,
  });
}

export function useKaryawanJahitQuery() {
  return useQuery({ queryKey: karyawanJahitKeys.all, queryFn: fetchKaryawanJahit });
}

export function useCreateJahitCardsForBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJahitCardsForBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useAssignKaryawanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignKaryawan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useMoveToReadyFinishingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moveToReadyFinishing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useUnassignCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unassignCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useMoveBackToProgressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moveBackToProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useMarkCardDoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markCardDone,
    onSuccess: () => {
      // Kartu pindah keluar dari board aktif + (mungkin) masuk ke arsip yang
      // lagi kebuka — invalidate keduanya. Arsip pakai predicate karena key-nya
      // parametrized per filter (queryKey[0] tetap "jahit-cards-done").
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["jahit-cards-done"] });
    },
  });
}
