import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlanning,
  createSampels,
  deleteSampel,
  fetchSampels,
  logWorkOrder,
  markSampelDibuat,
  mundurStepSampel,
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

export function useLogWorkOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logWorkOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all }),
  });
}
