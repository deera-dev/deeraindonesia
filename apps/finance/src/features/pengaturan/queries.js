/**
 * queries.js — useQuery/useMutation wrappers fitur Pengaturan.
 * Pemilik queryKey factory. Hanya diimport oleh hooks.js (lihat ARCHITECTURE.md §11.4).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFinanceConfig, saveFinanceConfigValue } from "./api";

export const pengaturanKeys = {
  config: ["finance-config"],
};

export function useFinanceConfigQuery() {
  return useQuery({ queryKey: pengaturanKeys.config, queryFn: fetchFinanceConfig });
}

export function useSaveFinanceConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, nilai }) => saveFinanceConfigValue(key, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pengaturanKeys.config });
    },
  });
}
