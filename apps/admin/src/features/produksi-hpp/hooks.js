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
import { useHppTemplateFilterStore, DEFAULT_HPP_FILTER } from "./store";

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

// Filter grid Template HPP (search box + HPPFilterModal) — pola sama dengan
// useProductFilter() (produk) dan useBatchFilter() (produksi-record).
export function useHppTemplateFilter() {
  const applied = useHppTemplateFilterStore((s) => s.applied);
  const draft = useHppTemplateFilterStore((s) => s.draft);
  const isModalOpen = useHppTemplateFilterStore((s) => s.isModalOpen);
  const openModal = useHppTemplateFilterStore((s) => s.openModal);
  const closeModal = useHppTemplateFilterStore((s) => s.closeModal);
  const setDraft = useHppTemplateFilterStore((s) => s.setDraft);
  const applyDraft = useHppTemplateFilterStore((s) => s.applyDraft);
  const resetAll = useHppTemplateFilterStore((s) => s.resetAll);

  const hasActiveFilter = Object.keys(DEFAULT_HPP_FILTER).some(
    (key) => applied[key] !== DEFAULT_HPP_FILTER[key],
  );

  return {
    applied,
    draft,
    isModalOpen,
    openModal,
    closeModal,
    setDraft,
    applyDraft,
    resetAll,
    hasActiveFilter,
  };
}
