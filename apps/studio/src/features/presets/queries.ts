import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAccessoryPreset,
  createBackgroundPreset,
  deleteAccessoryPreset,
  deleteBackgroundPreset,
  fetchAccessoryPresets,
  fetchBackgroundPresets,
  updateAccessoryPreset,
  updateBackgroundPreset,
} from "./api";

export const presetKeys = {
  background: ["presets", "background"] as const,
  accessory: ["presets", "accessory"] as const,
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>, key: readonly string[]) {
  queryClient.invalidateQueries({ queryKey: key });
}

export function useBackgroundPresetsQuery() {
  return useQuery({ queryKey: presetKeys.background, queryFn: fetchBackgroundPresets });
}

export function useCreateBackgroundPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBackgroundPreset,
    onSuccess: () => invalidate(queryClient, presetKeys.background),
  });
}

export function useUpdateBackgroundPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBackgroundPreset,
    onSuccess: () => invalidate(queryClient, presetKeys.background),
  });
}

export function useDeleteBackgroundPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBackgroundPreset,
    onSuccess: () => invalidate(queryClient, presetKeys.background),
  });
}

export function useAccessoryPresetsQuery() {
  return useQuery({ queryKey: presetKeys.accessory, queryFn: fetchAccessoryPresets });
}

export function useCreateAccessoryPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccessoryPreset,
    onSuccess: () => invalidate(queryClient, presetKeys.accessory),
  });
}

export function useUpdateAccessoryPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAccessoryPreset,
    onSuccess: () => invalidate(queryClient, presetKeys.accessory),
  });
}

export function useDeleteAccessoryPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccessoryPreset,
    onSuccess: () => invalidate(queryClient, presetKeys.accessory),
  });
}
