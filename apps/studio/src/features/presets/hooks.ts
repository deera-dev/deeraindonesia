import {
  useAccessoryPresetsQuery,
  useBackgroundPresetsQuery,
  useCreateAccessoryPresetMutation,
  useCreateBackgroundPresetMutation,
  useDeleteAccessoryPresetMutation,
  useDeleteBackgroundPresetMutation,
  useUpdateAccessoryPresetMutation,
  useUpdateBackgroundPresetMutation,
} from "./queries";
import type {
  CreateAccessoryPresetInput,
  CreateBackgroundPresetInput,
  UpdateAccessoryPresetInput,
  UpdateBackgroundPresetInput,
} from "./schema";

export function useBackgroundPresets() {
  const { data, isLoading, error } = useBackgroundPresetsQuery();
  return { presets: data ?? [], loading: isLoading, error };
}

export function useCreateBackgroundPreset() {
  const { mutateAsync } = useCreateBackgroundPresetMutation();
  return (input: CreateBackgroundPresetInput) => mutateAsync(input);
}

export function useUpdateBackgroundPreset() {
  const { mutateAsync } = useUpdateBackgroundPresetMutation();
  return (input: UpdateBackgroundPresetInput) => mutateAsync(input);
}

export function useDeleteBackgroundPreset() {
  const { mutateAsync } = useDeleteBackgroundPresetMutation();
  return (id: string) => mutateAsync(id);
}

export function useAccessoryPresets() {
  const { data, isLoading, error } = useAccessoryPresetsQuery();
  return { presets: data ?? [], loading: isLoading, error };
}

export function useCreateAccessoryPreset() {
  const { mutateAsync } = useCreateAccessoryPresetMutation();
  return (input: CreateAccessoryPresetInput) => mutateAsync(input);
}

export function useUpdateAccessoryPreset() {
  const { mutateAsync } = useUpdateAccessoryPresetMutation();
  return (input: UpdateAccessoryPresetInput) => mutateAsync(input);
}

export function useDeleteAccessoryPreset() {
  const { mutateAsync } = useDeleteAccessoryPresetMutation();
  return (id: string) => mutateAsync(id);
}
