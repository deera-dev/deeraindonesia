/**
 * queries.js — Wrapper TanStack Query (useQuery/useMutation) untuk fitur
 * produksi-sampel.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlanning,
  createSampels,
  deleteSampel,
  fetchSampels,
  markSampelDibuat,
  saveBatchDecisions,
  updateSampel,
} from "./api";

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
    mutationFn: ({ entry, bahanFotoUrl, modelFotoUrls, userEmail, userName }) =>
      createPlanning(entry, bahanFotoUrl, modelFotoUrls, { userEmail, userName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useMarkSampelDibuatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nomor, nama, foto }) => markSampelDibuat({ id, nomor, nama, foto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useCreateSampelsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entries, urlsArr, userEmail, userName }) =>
      createSampels(entries, urlsArr, { userEmail, userName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produksiSampelKeys.all });
    },
  });
}

export function useSaveBatchDecisionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decisions, sampelMap, userEmail }) =>
      saveBatchDecisions(decisions, sampelMap, { userEmail }),
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
