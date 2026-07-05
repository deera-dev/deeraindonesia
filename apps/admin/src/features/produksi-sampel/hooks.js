/**
 * hooks.js — PUBLIC SURFACE fitur produksi-sampel.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion ala React).
 */
import {
  useCreateSampelsMutation,
  useDeleteSampelMutation,
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
