import {
  useApproveRepeatMutation,
  useLanjutWorkOrderMutation,
  useCreatePlanningMutation,
  useCreateSampelsMutation,
  useDeleteSampelMutation,
  useLogWorkOrderMutation,
  useMarkSampelDibuatMutation,
  useMundurStepMutation,
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

export function useMundurStep() {
  const { mutateAsync } = useMundurStepMutation();
  return (sampel) => mutateAsync(sampel);
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

export function useTogglePinned() {
  const { mutateAsync } = useTogglePinnedMutation();
  return (id, pinned) => mutateAsync({ id, pinned });
}

export function useLogWorkOrder() {
  const { mutateAsync } = useLogWorkOrderMutation();
  return (params) => mutateAsync(params);
}
