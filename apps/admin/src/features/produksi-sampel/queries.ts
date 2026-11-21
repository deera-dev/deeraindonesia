import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveRepeat,
  createPlanning,
  deleteSampel,
  fetchSampels,
  logWorkOrder,
  markSampelDibuat,
  mundurStepSampel,
  reorderPlanning,
  saveBatchDecisions,
  saveWoDraft,
  setWoSelesai,
  togglePinned,
  updatePlanning,
  updateSampel,
} from "./api";
import type {
  BahanItemFoto,
  DecisionsMap,
  PlanningEntry,
  ReorderUpdate,
  Sampel,
  SampelMap,
} from "./schema";

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
    mutationFn: ({
      entry,
      bahanFotoUrl,
      modelFotoUrls,
      bahanItems,
      urutan,
    }: {
      entry: PlanningEntry;
      bahanFotoUrl?: string | null;
      modelFotoUrls?: string[];
      bahanItems?: BahanItemFoto[];
      urutan?: number;
    }) => createPlanning(entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useReorderPlanningMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: ReorderUpdate[]) => reorderPlanning(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useMarkSampelDibuatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      nomor,
      nama,
      foto,
    }: {
      id: string;
      nomor: string;
      nama: string;
      foto: string[];
    }) => markSampelDibuat({ id, nomor, nama, foto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useApproveRepeatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sampel,
      foto,
      catatan,
    }: {
      sampel: Sampel;
      foto?: string[];
      catatan?: string | null;
    }) => approveRepeat({ id: sampel.id, foto, catatan }),
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
    mutationFn: (sampel: Sampel) => mundurStepSampel(sampel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all }),
  });
}

export function useSetWoSelesaiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sampel, selesai }: { sampel: Sampel; selesai: boolean }) =>
      setWoSelesai({ id: sampel.id, nomor: sampel.nomor, nama: sampel.nama, selesai }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useSaveBatchDecisionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      decisions,
      sampelMap,
      userEmail,
    }: {
      decisions: DecisionsMap;
      sampelMap: SampelMap;
      userEmail: string | null | undefined;
    }) => saveBatchDecisions(decisions, sampelMap, userEmail),
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
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => togglePinned(id, pinned),
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

export function useSaveWoDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWoDraft,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all }),
  });
}
