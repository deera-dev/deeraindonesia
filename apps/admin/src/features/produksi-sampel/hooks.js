/**
 * hooks.js — PUBLIC SURFACE fitur produksi-sampel.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion ala React).
 */
import {
  useAddCommentMutation,
  useCommentsQuery,
  useCreatePlanningMutation,
  useCreateSampelsMutation,
  useDeleteCommentMutation,
  useDeleteSampelMutation,
  useLogWorkOrderMutation,
  useMarkSampelDibuatMutation,
  useReorderPlanningMutation,
  useSampelsQuery,
  useSaveBatchDecisionsMutation,
  useTogglePinnedMutation,
  useUpdateSampelMutation,
} from "./queries";

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
