/**
 * hooks.js — PUBLIC SURFACE fitur produksi-sampel.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion ala React).
 */
import {
  useAddCommentMutation,
  useApproveRepeatMutation,
  useLanjutWorkOrderMutation,
  useUnreadDiskusiQuery,
  useCommentsQuery,
  useCreatePlanningMutation,
  useCreateSampelsMutation,
  useDeleteCommentMutation,
  useDeleteSampelMutation,
  useLogWorkOrderMutation,
  useMarkSampelDibuatMutation,
  useMarkSampelReadMutation,
  useReadsBySampelQuery,
  useReorderPlanningMutation,
  useSampelsQuery,
  useSaveBatchDecisionsMutation,
  useSetWoSelesaiMutation,
  useTogglePinnedMutation,
  useUpdateSampelMutation,
  useUpdatePlanningMutation,
} from "./queries";

export function useSampels() {
  const { data, isLoading } = useSampelsQuery();
  return { sampels: data ?? [], loading: isLoading };
}

export function useUpdateSampel() {
  const { mutateAsync } = useUpdateSampelMutation();
  return (params) => mutateAsync(params);
}

export function useUpdatePlanning() {
  const { mutateAsync } = useUpdatePlanningMutation();
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

export function useApproveRepeat() {
  const { mutateAsync } = useApproveRepeatMutation();
  return ({ sampel, foto, catatan, userEmail }) => mutateAsync({ sampel, foto, catatan, userEmail });
}

export function useLanjutWorkOrder() {
  const { mutateAsync } = useLanjutWorkOrderMutation();
  return ({ sampel, userEmail }) => mutateAsync({ sampel, userEmail });
}

export function useSetWoSelesai() {
  const { mutateAsync } = useSetWoSelesaiMutation();
  return (sampel, selesai) => mutateAsync({ sampel, selesai });
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
// Semua angka unread datang dari backend (RPC get_unread_diskusi). Selama data
// belum ada, total = 0 / map kosong (tidak ada "kedip" angka palsu saat loading).
export function useUnreadCounts() {
  const { data, isLoading } = useUnreadDiskusiQuery();
  return { unreadCounts: data?.per_sampel ?? {}, loading: isLoading };
}

// Total unread lintas SEMUA planning (badge di nav "PRODUKSI").
export function useTotalUnreadCount() {
  const { data, isLoading } = useUnreadDiskusiQuery();
  return { total: Number(data?.total ?? 0), loading: isLoading };
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
