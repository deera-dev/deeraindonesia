import { supabase } from "@deera/shared/lib/supabase";
import {
  type AiPose,
  aiPosesResponseSchema,
  type CreatePoseInput,
  type UpdatePoseInput,
} from "./schema";

/**
 * Still calls Supabase directly rather than invoking the deployed
 * `studio-poses-crud` Edge Function - same deferral as
 * features/models/api.ts and packages/shared/features/products/api.ts
 * (outbound proxy 403s on *.supabase.co/functions/v1 from this sandbox).
 * setBackView mirrors the function's two-step clear-then-set exactly so
 * the direct-call path and the Edge Function enforce the same "at most
 * one back-view pose per model" rule either way.
 */
export async function fetchPoses(modelId: string): Promise<AiPose[]> {
  const { data, error } = await supabase
    .from("ai_poses")
    .select("*")
    .eq("model_id", modelId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return aiPosesResponseSchema.parse(data ?? []);
}

export async function createPose(input: CreatePoseInput): Promise<AiPose> {
  const { data, error } = await supabase.from("ai_poses").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updatePose(input: UpdatePoseInput): Promise<AiPose> {
  const { data, error } = await supabase
    .from("ai_poses")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePose(id: string): Promise<void> {
  const { error } = await supabase.from("ai_poses").delete().eq("id", id);
  if (error) throw error;
}

export async function setBackView(params: {
  id: string;
  model_id: string;
  value: boolean;
}): Promise<AiPose> {
  if (params.value) {
    const { error: clearErr } = await supabase
      .from("ai_poses")
      .update({ is_back_view: false })
      .eq("model_id", params.model_id)
      .eq("is_back_view", true)
      .neq("id", params.id);
    if (clearErr) throw clearErr;
  }
  const { data, error } = await supabase
    .from("ai_poses")
    .update({ is_back_view: params.value })
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
