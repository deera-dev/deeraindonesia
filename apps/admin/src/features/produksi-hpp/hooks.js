/**
 * hooks.js — PUBLIC SURFACE fitur template HPP.
 * Komponen HANYA boleh import dari sini (atau index.js) — tidak pernah dari
 * api.js/queries.js secara langsung (Dependency Inversion ala React).
 */
import {
  useBahanOptionsQuery,
  useDeleteHppTemplateMutation,
  useHppConfigQuery,
  useHppConfigRowsQuery,
  useHppTemplatesQuery,
  useSaveHppConfigMutation,
  useSaveHppTemplatesMutation,
} from "./queries";

export function useHppTemplates() {
  const { data, isLoading } = useHppTemplatesQuery();
  return { templates: data ?? [], loading: isLoading };
}

export function useHppConfig() {
  const { data } = useHppConfigQuery();
  return data ?? {};
}

export function useHppConfigRows() {
  const { data, isLoading, isError, refetch } = useHppConfigRowsQuery();
  return { rows: data ?? [], loading: isLoading, error: isError, refetch };
}

export function useBahanOptions() {
  const { data } = useBahanOptionsQuery();
  return data ?? [];
}

export function useSaveHppTemplates() {
  const { mutateAsync } = useSaveHppTemplatesMutation();
  return (payloads, templates, userEmail) => mutateAsync({ payloads, templates, userEmail });
}

export function useDeleteHppTemplate() {
  const { mutateAsync } = useDeleteHppTemplateMutation();
  return (target) => mutateAsync(target);
}

export function useSaveHppConfig() {
  const { mutateAsync } = useSaveHppConfigMutation();
  return (key, nilai, userEmail) => mutateAsync({ key, nilai, userEmail });
}
