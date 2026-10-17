import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addComment,
  createPlanning,
  createSampels,
  deleteComment,
  deleteSampel,
  fetchUnreadDiskusi,
  fetchComments,
  fetchReadsBySampel,
  fetchSampels,
  logWorkOrder,
  markSampelDibuat,
  mundurStepSampel,
  markSampelRead,
  reorderPlanning,
  saveBatchDecisions,
  togglePinned,
  updateSampel,
  approveRepeat,
  lanjutKeWorkOrder,
  setWoSelesai,
  updatePlanning,
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

export function useApproveRepeatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sampel, foto, catatan, userEmail }) =>
      approveRepeat(
        { id: sampel.id, nomor: sampel.nomor, nama: sampel.nama, foto, catatan },
        { userEmail },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useLanjutWorkOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sampel, userEmail }) =>
      lanjutKeWorkOrder({ id: sampel.id, nomor: sampel.nomor, nama: sampel.nama }, { userEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useUpdatePlanningMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlanning,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useMundurStepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sampel) => mundurStepSampel(sampel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all }),
  });
}

export function useSetWoSelesaiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sampel, selesai }) =>
      setWoSelesai({ id: sampel.id, nomor: sampel.nomor, nama: sampel.nama, selesai }),
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

export function useTogglePinnedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }) => togglePinned(id, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: sampelReadsKeys.unread });
    },
  });
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteComment(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sampelCommentsKeys.bySampel(variables.sampelId) });
      queryClient.invalidateQueries({ queryKey: sampelReadsKeys.unread });
    },
  });
}

export function useLogWorkOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logWorkOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all }),
  });
}

export const sampelReadsKeys = {
  unread: ["sampel-unread"],
  bySampel: (sampelId) => ["sampel-reads", "sampel", sampelId],
};

export function useUnreadDiskusiQuery() {
  return useQuery({ queryKey: sampelReadsKeys.unread, queryFn: fetchUnreadDiskusi, refetchOnWindowFocus: true });
}

export function useReadsBySampelQuery(sampelId) {
  return useQuery({
    queryKey: sampelReadsKeys.bySampel(sampelId),
    queryFn: () => fetchReadsBySampel(sampelId),
    enabled: !!sampelId,
  });
}

export function useMarkSampelReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markSampelRead,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sampelReadsKeys.unread });
      queryClient.invalidateQueries({ queryKey: sampelReadsKeys.bySampel(variables.sampelId) });
    },
  });
}
