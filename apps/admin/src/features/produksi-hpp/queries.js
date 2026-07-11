/**
 * queries.js — Wrapper TanStack Query (useQuery/useMutation) untuk fitur template HPP.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteHppTemplate,
  fetchBahanOptions,
  fetchHppConfig,
  fetchHppConfigRows,
  fetchHppTemplates,
  saveHppConfigValue,
  saveHppTemplates,
} from "./api";

export const produksiHppKeys = {
  templates: ["produksi-hpp", "templates"],
  config: ["produksi-hpp", "config"],
  configRows: ["produksi-hpp", "config-rows"],
  bahanOptions: ["produksi-hpp", "bahan-options"],
};

export function useHppTemplatesQuery() {
  return useQuery({ queryKey: produksiHppKeys.templates, queryFn: fetchHppTemplates });
}

export function useHppConfigQuery() {
  return useQuery({ queryKey: produksiHppKeys.config, queryFn: fetchHppConfig });
}

export function useHppConfigRowsQuery() {
  return useQuery({ queryKey: produksiHppKeys.configRows, queryFn: fetchHppConfigRows });
}

export function useBahanOptionsQuery() {
  return useQuery({ queryKey: produksiHppKeys.bahanOptions, queryFn: fetchBahanOptions });
}

export function useSaveHppTemplatesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payloads, templates, userEmail }) =>
      saveHppTemplates(payloads, { templates, userEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiHppKeys.templates });
    },
  });
}

export function useDeleteHppTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target) => deleteHppTemplate(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiHppKeys.templates });
    },
  });
}

export function useSaveHppConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, nilai, userEmail }) => saveHppConfigValue(key, nilai, userEmail),
    onSuccess: () => {
      // Bug lama: invalidate hanya menyasar `config` (bentuk map, dipakai
      // kalkulasi) dan `produksiHppKeys.all` yang sebenarnya tidak pernah
      // ada di objek ini (no-op). Akibatnya `configRows` (bentuk list, yang
      // ditampilkan di UI Harga Dasar) tidak pernah ter-refresh otomatis
      // setelah simpan. Diperbaiki: invalidate keduanya.
      queryClient.invalidateQueries({ queryKey: produksiHppKeys.config });
      queryClient.invalidateQueries({ queryKey: produksiHppKeys.configRows });
    },
  });
}
