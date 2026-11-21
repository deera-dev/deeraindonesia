import {
  useApproveRepeatMutation,
  useCreatePlanningMutation,
  useDeleteSampelMutation,
  useLogWorkOrderMutation,
  useMarkSampelDibuatMutation,
  useMundurStepMutation,
  useReorderPlanningMutation,
  useSampelsQuery,
  useSaveBatchDecisionsMutation,
  useSaveWoDraftMutation,
  useSetWoSelesaiMutation,
  useTogglePinnedMutation,
  useUpdatePlanningMutation,
  useUpdateSampelMutation,
} from "./queries";
import type { BahanItemFoto, PlanningEntry, Sampel } from "./schema";
import { useWoDraftStore } from "./store";

export function useSampels() {
  const { data, isLoading } = useSampelsQuery();
  return { sampels: data ?? [], loading: isLoading };
}

export function useUpdateSampel() {
  const { mutateAsync } = useUpdateSampelMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useUpdatePlanning() {
  const { mutateAsync } = useUpdatePlanningMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useCreatePlanning() {
  const { mutateAsync } = useCreatePlanningMutation();
  return (
    entry: PlanningEntry,
    bahanFotoUrl?: string | null,
    modelFotoUrls?: string[],
    bahanItems?: BahanItemFoto[],
    urutan?: number,
  ) => mutateAsync({ entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan });
}

export function useReorderPlanning() {
  const { mutateAsync } = useReorderPlanningMutation();
  return (updates: Parameters<typeof mutateAsync>[0]) => mutateAsync(updates);
}

export function useMundurStep() {
  const { mutateAsync } = useMundurStepMutation();
  return (sampel: Sampel) => mutateAsync(sampel);
}

export function useMarkSampelDibuat() {
  const { mutateAsync } = useMarkSampelDibuatMutation();
  return ({ id, nomor, nama, foto }: { id: string; nomor: string; nama: string; foto: string[] }) =>
    mutateAsync({ id, nomor, nama, foto });
}

export function useApproveRepeat() {
  const { mutateAsync } = useApproveRepeatMutation();
  return ({
    sampel,
    foto,
    catatan,
  }: {
    sampel: Sampel;
    foto?: string[];
    catatan?: string | null;
  }) => mutateAsync({ sampel, foto, catatan });
}

export function useSetWoSelesai() {
  const { mutateAsync } = useSetWoSelesaiMutation();
  return (sampel: Sampel, selesai: boolean) => mutateAsync({ sampel, selesai });
}

export function useSaveBatchDecisions() {
  const { mutateAsync } = useSaveBatchDecisionsMutation();
  return (
    decisions: Parameters<typeof mutateAsync>[0]["decisions"],
    sampelMap: Parameters<typeof mutateAsync>[0]["sampelMap"],
    userEmail: Parameters<typeof mutateAsync>[0]["userEmail"],
  ) => mutateAsync({ decisions, sampelMap, userEmail });
}

export function useDeleteSampel() {
  const { mutateAsync } = useDeleteSampelMutation();
  return (id: string) => mutateAsync(id);
}

export function useTogglePinned() {
  const { mutateAsync } = useTogglePinnedMutation();
  return (id: string, pinned: boolean) => mutateAsync({ id, pinned });
}

export function useLogWorkOrder() {
  const { mutateAsync } = useLogWorkOrderMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useSaveWoDraft() {
  const { mutateAsync } = useSaveWoDraftMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useWoDraft(sampelId: string | null | undefined) {
  const draft = useWoDraftStore((s) => (sampelId ? s.drafts[sampelId] : undefined));
  const saveDraftFn = useWoDraftStore((s) => s.saveDraft);
  const clearDraftFn = useWoDraftStore((s) => s.clearDraft);
  return {
    draft,
    saveDraft: (patch: Record<string, unknown>) => sampelId && saveDraftFn(sampelId, patch),
    clearDraft: () => sampelId && clearDraftFn(sampelId),
  };
}
