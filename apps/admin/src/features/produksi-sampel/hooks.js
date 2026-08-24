/**
 * hooks.js — PUBLIC SURFACE fitur produksi-sampel.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion ala React).
 */
import {
  useCreatePlanningMutation,
  useCreateSampelsMutation,
  useDeleteSampelMutation,
  useMarkSampelDibuatMutation,
  useReorderPlanningMutation,
  useSampelsQuery,
  useSaveBatchDecisionsMutation,
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
