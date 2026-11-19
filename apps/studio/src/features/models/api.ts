import { supabase } from "@deera/shared/lib/supabase";
import {
  type AiModel,
  aiModelsResponseSchema,
  type CreateModelInput,
  type UpdateModelInput,
} from "./schema";

/**
 * Still calls Supabase directly rather than invoking the deployed
 * `studio-models-crud` Edge Function - same deferral as
 * packages/shared/features/products/api.ts: this sandbox's outbound proxy
 * returns a policy 403 on *.supabase.co/functions/v1 (confirmed live,
 * 2026-11-19 - see docs/decisions/stack-rewrite-2026.md §6), so there is no
 * network path here to verify the HTTP round-trip before depending on it.
 * The function is deployed, forwards the caller's own JWT, and matches
 * this file's behavior action-for-action; the client cutover is deferred
 * to a real browser/Vercel preview. `ai_models` RLS (authenticated_full_
 * access) means this direct call and the Edge Function enforce identical
 * access today either way.
 */
export async function fetchModels(onlyActive = false): Promise<AiModel[]> {
  let query = supabase.from("ai_models").select("*");
  query = onlyActive
    ? query.eq("is_active", true).order("name", { ascending: true })
    : query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return aiModelsResponseSchema.parse(data ?? []);
}

export async function createModel(input: CreateModelInput): Promise<AiModel> {
  const { data, error } = await supabase.from("ai_models").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateModel(input: UpdateModelInput): Promise<AiModel> {
  const { data, error } = await supabase
    .from("ai_models")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteModel(id: string): Promise<void> {
  const { error } = await supabase.from("ai_models").delete().eq("id", id);
  if (error) throw error;
}
