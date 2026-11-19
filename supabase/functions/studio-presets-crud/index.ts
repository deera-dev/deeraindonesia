/**
 * studio-presets-crud — Supabase Edge Function
 *
 * Fronts apps/studio's presets feature: two tables sharing one function
 * since both are simple style-library CRUD with the same shape (name +
 * prompt fragment + optional reference photo + is_active) — background
 * presets (ai_background_presets, target 15-20+, PRD §12 v0.5) and
 * category-scoped accessory presets (ai_accessory_presets, PRD §7.4 v0.4).
 * RLS on both is `authenticated_full_access`, so this forwards the
 * caller's own JWT, same as studio-models-crud / studio-poses-crud.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

async function listBackgroundPresets(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("ai_background_presets")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface BackgroundCreateInput {
  name: string;
  prompt_fragment: string;
  reference_image_url: string | null;
  mood_tags: string[];
  warna_affinity: string[];
  cocok_untuk_kategori: string[];
}

async function createBackgroundPreset(supabase: SupabaseClient, input: BackgroundCreateInput) {
  const { data, error } = await supabase
    .from("ai_background_presets")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

interface BackgroundUpdateInput {
  id: string;
  patch: Partial<BackgroundCreateInput & { is_active: boolean }>;
}

async function updateBackgroundPreset(supabase: SupabaseClient, input: BackgroundUpdateInput) {
  const { data, error } = await supabase
    .from("ai_background_presets")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteBackgroundPreset(supabase: SupabaseClient, input: { id: string }) {
  const { error } = await supabase.from("ai_background_presets").delete().eq("id", input.id);
  if (error) throw error;
  return { ok: true };
}

async function listAccessoryPresets(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("ai_accessory_presets")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface AccessoryCreateInput {
  category: "tas" | "kalung" | "cincin" | "anting";
  name: string;
  prompt_fragment: string;
  reference_image_url: string | null;
}

async function createAccessoryPreset(supabase: SupabaseClient, input: AccessoryCreateInput) {
  const { data, error } = await supabase
    .from("ai_accessory_presets")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

interface AccessoryUpdateInput {
  id: string;
  patch: Partial<AccessoryCreateInput & { is_active: boolean }>;
}

async function updateAccessoryPreset(supabase: SupabaseClient, input: AccessoryUpdateInput) {
  const { data, error } = await supabase
    .from("ai_accessory_presets")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteAccessoryPreset(supabase: SupabaseClient, input: { id: string }) {
  const { error } = await supabase.from("ai_accessory_presets").delete().eq("id", input.id);
  if (error) throw error;
  return { ok: true };
}

const handler = createActionHandler(
  {
    listBackground: (_input, { supabase }) => listBackgroundPresets(supabase),
    createBackground: (input, { supabase }) =>
      createBackgroundPreset(supabase, input as BackgroundCreateInput),
    updateBackground: (input, { supabase }) =>
      updateBackgroundPreset(supabase, input as BackgroundUpdateInput),
    removeBackground: (input, { supabase }) =>
      deleteBackgroundPreset(supabase, input as { id: string }),
    listAccessory: (_input, { supabase }) => listAccessoryPresets(supabase),
    createAccessory: (input, { supabase }) =>
      createAccessoryPreset(supabase, input as AccessoryCreateInput),
    updateAccessory: (input, { supabase }) =>
      updateAccessoryPreset(supabase, input as AccessoryUpdateInput),
    removeAccessory: (input, { supabase }) =>
      deleteAccessoryPreset(supabase, input as { id: string }),
  },
  getClient,
);

Deno.serve(handler);
