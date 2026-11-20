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
    mutationFn: (payloads) => saveHppTemplates(payloads),
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
    mutationFn: ({ key, nilai }) => saveHppConfigValue(key, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiHppKeys.config });
      queryClient.invalidateQueries({ queryKey: produksiHppKeys.configRows });
    },
  });
}
