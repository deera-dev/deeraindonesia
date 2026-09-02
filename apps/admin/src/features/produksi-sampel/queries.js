/**
 * queries.js — Wrapper TanStack Query (useQuery/useMutation) untuk fitur
 * produksi-sampel.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addComment,
  createPlanning,
  createSampels,
  deleteComment,
  deleteSampel,
  fetchComments,
  fetchSampels,
  logWorkOrder,
  markSampelDibuat,
  reorderPlanning,
  saveBatchDecisions,
  togglePinned,
  updateSampel,
} from "./api";

export const produksiSampelKeys = {
  all: ["produksi-sampel"],
};

export const sampelCommentsKeys = {
  bySampel: (sampelId) => ["sampel-comments", sampelId],
};

export function useSampelsQuery() {
  return useQuery({ queryKey: produksiSampelKeys.all, queryFn: fetchSampels });
}

export function useUpdateSampelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSampel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useCreatePlanningMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan, userEmail, userName }) =>
      createPlanning(entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan, { userEmail, userName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

// Reorder antrean Planning (drag & drop). TIDAK invalidate on success — UI
// (PlanningQueueList) sudah menampilkan urutan baru secara optimistik lewat
// state lokal dnd-kit selama drag; invalidate di sini hanya perlu untuk
// menyinkronkan ulang dari server di kunjungan berikutnya, bukan untuk
// re-render instan (yang malah bisa bikin list "lompat" sesaat).
export function useReorderPlanningMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates) => reorderPlanning(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useMarkSampelDibuatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nomor, nama, foto }) => markSampelDibuat({ id, nomor, nama, foto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useCreateSampelsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entries, urlsArr, userEmail, userName }) =>
      createSampels(entries, urlsArr, { userEmail, userName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useSaveBatchDecisionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decisions, sampelMap, userEmail }) =>
      saveBatchDecisions(decisions, sampelMap, { userEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useDeleteSampelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSampel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

// ── Pin planning penting (permintaan Denny 2026-09) ───────────────────────────
export function useTogglePinnedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }) => togglePinned(id, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

// ── Komentar / diskusi Planning (permintaan Denny 2026-09) ───────────────────
export function useCommentsQuery(sampelId) {
  return useQuery({
    queryKey: sampelCommentsKeys.bySampel(sampelId),
    queryFn: () => fetchComments(sampelId),
    enabled: !!sampelId,
  });
}

export function useAddCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addComment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sampelCommentsKeys.bySampel(variables.sampelId) });
    },
  });
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteComment(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sampelCommentsKeys.bySampel(variables.sampelId) });
    },
  });
}

// ── Work Order untuk tukang potong (permintaan Denny 2026-09) ────────────────
// TIDAK invalidate produksiSampelKeys — logWorkOrder cuma menulis ke
// product_history (audit trail), tidak mengubah kolom apa pun di tabel
// `sampel`, jadi tidak ada cache sampel yang jadi stale.
export function useLogWorkOrderMutation() {
  return useMutation({ mutationFn: logWorkOrder });
}
