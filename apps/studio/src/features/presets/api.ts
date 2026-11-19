import { supabase } from "@deera/shared/lib/supabase";
import {
  type AccessoryPreset,
  accessoryPresetsResponseSchema,
  type BackgroundPreset,
  backgroundPresetsResponseSchema,
  type CreateAccessoryPresetInput,
  type CreateBackgroundPresetInput,
  type UpdateAccessoryPresetInput,
  type UpdateBackgroundPresetInput,
} from "./schema";

/**
 * Still calls Supabase directly rather than invoking the deployed
 * `studio-presets-crud` Edge Function - same deferral as
 * features/models/api.ts and features/poses/api.ts.
 */
export async function fetchBackgroundPresets(): Promise<BackgroundPreset[]> {
  const { data, error } = await supabase
    .from("ai_background_presets")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return backgroundPresetsResponseSchema.parse(data ?? []);
}

export async function createBackgroundPreset(
  input: CreateBackgroundPresetInput,
): Promise<BackgroundPreset> {
  const { data, error } = await supabase
    .from("ai_background_presets")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBackgroundPreset(
  input: UpdateBackgroundPresetInput,
): Promise<BackgroundPreset> {
  const { data, error } = await supabase
    .from("ai_background_presets")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBackgroundPreset(id: string): Promise<void> {
  const { error } = await supabase.from("ai_background_presets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAccessoryPresets(): Promise<AccessoryPreset[]> {
  const { data, error } = await supabase
    .from("ai_accessory_presets")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return accessoryPresetsResponseSchema.parse(data ?? []);
}

export async function createAccessoryPreset(
  input: CreateAccessoryPresetInput,
): Promise<AccessoryPreset> {
  const { data, error } = await supabase
    .from("ai_accessory_presets")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccessoryPreset(
  input: UpdateAccessoryPresetInput,
): Promise<AccessoryPreset> {
  const { data, error } = await supabase
    .from("ai_accessory_presets")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccessoryPreset(id: string): Promise<void> {
  const { error } = await supabase.from("ai_accessory_presets").delete().eq("id", id);
  if (error) throw error;
}
