/**
 * hooks.js — PUBLIC SURFACE fitur produksi-sampel.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion ala React).
 */
import {
  useAddCommentMutation,
  useAllCommentsMetaQuery,
  useCommentsQuery,
  useCreatePlanningMutation,
  useCreateSampelsMutation,
  useDeleteCommentMutation,
  useDeleteSampelMutation,
  useLogWorkOrderMutation,
  useMarkSampelDibuatMutation,
  useMarkSampelReadMutation,
  useReadsBySampelQuery,
  useReadsForUserQuery,
  useReorderPlanningMutation,
  useSampelsQuery,
  useSaveBatchDecisionsMutation,
  useTogglePinnedMutation,
  useUpdateSampelMutation,
} from "./queries";
import { computeUnreadCounts, sumUnreadCounts } from "./utils";

export function useSampels() {
  const { data, isLoading } = useSampelsQuery();
  return { sampels: data ?? [], loading: isLoading };
}

export function useUpdateSampel() {
  const { mutateAsync } = useUpdateSampelMutation();
  return (params) => mutateAsync(params);
}

export function useCreatePlanning() {
  const { mutateAsync } = useCreatePlanningMutation();
  return (entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan, userEmail, userName) =>
    mutateAsync({ entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan, userEmail, userName });
}

export function useReorderPlanning() {
  const { mutateAsync } = useReorderPlanningMutation();
  return (updates) => mutateAsync(updates);
}

export function useMarkSampelDibuat() {
  const { mutateAsync } = useMarkSampelDibuatMutation();
  return ({ id, nomor, nama, foto }) => mutateAsync({ id, nomor, nama, foto });
}

export function useCreateSampels() {
  const { mutateAsync } = useCreateSampelsMutation();
  return (entries, urlsArr, userEmail, userName) =>
    mutateAsync({ entries, urlsArr, userEmail, userName });
}

export function useSaveBatchDecisions() {
  const { mutateAsync } = useSaveBatchDecisionsMutation();
  return (decisions, sampelMap, userEmail) =>
    mutateAsync({ decisions, sampelMap, userEmail });
}

export function useDeleteSampel() {
  const { mutateAsync } = useDeleteSampelMutation();
  return (id) => mutateAsync(id);
}

// ── Pin planning penting (permintaan Denny 2026-09) ───────────────────────────
export function useTogglePinned() {
  const { mutateAsync } = useTogglePinnedMutation();
  return (id, pinned) => mutateAsync({ id, pinned });
}

// ── Komentar / diskusi Planning (permintaan Denny 2026-09) ───────────────────
export function useComments(sampelId) {
  const { data, isLoading } = useCommentsQuery(sampelId);
  return { comments: data ?? [], loading: isLoading };
}

export function useAddComment() {
  const { mutateAsync, isPending } = useAddCommentMutation();
  return { addComment: (params) => mutateAsync(params), adding: isPending };
}

export function useDeleteComment() {
  const { mutateAsync } = useDeleteCommentMutation();
  return (id, sampelId) => mutateAsync({ id, sampelId });
}

// ── Work Order untuk tukang potong (permintaan Denny 2026-09) ────────────────
export function useLogWorkOrder() {
  const { mutateAsync } = useLogWorkOrderMutation();
  return (params) => mutateAsync(params);
}

// ── Read receipts Diskusi (permintaan Denny 2026-09: badge unread + "siapa
// sudah baca") ────────────────────────────────────────────────────────────

// Map { [sampelId]: unreadCount } utk SEMUA planning sekaligus — dihitung
// dari 2 query ringan (meta komentar lintas-sampel + baris read milik user
// login), BUKAN 1 query useComments() per kartu (hindari N+1, lihat
// api.js fetchAllCommentsMeta).
export function useUnreadCounts(userEmail) {
  const { data: commentsMeta, isLoading: loadingComments } = useAllCommentsMetaQuery();
  const { data: reads, isLoading: loadingReads } = useReadsForUserQuery(userEmail);
  return {
    unreadCounts: computeUnreadCounts(commentsMeta ?? [], reads ?? [], userEmail),
    loading: loadingComments || loadingReads,
  };
}

// Total unread lintas SEMUA planning (permintaan Denny 2026-09: badge di
// item nav "PRODUKSI", bukan cuma di tombol Catatan/Diskusi per kartu) —
// reuse 2 query yang sama dgn useUnreadCounts, tidak ada query tambahan.
export function useTotalUnreadCount(userEmail) {
  const { unreadCounts, loading } = useUnreadCounts(userEmail);
  return { total: sumUnreadCounts(unreadCounts), loading };
}

// Daftar siapa saja yang sudah baca SATU planning (semua user, dgn
// last_read_at masing-masing) — dipakai CommentThread.jsx utk "Dibaca oleh".
export function useReadsBySampel(sampelId) {
  const { data, isLoading } = useReadsBySampelQuery(sampelId);
  return { reads: data ?? [], loading: isLoading };
}

export function useMarkSampelRead() {
  const { mutateAsync } = useMarkSampelReadMutation();
  return ({ sampelId, userEmail, userName }) => mutateAsync({ sampelId, userEmail, userName });
}
