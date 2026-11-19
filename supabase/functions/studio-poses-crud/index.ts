/**
 * studio-poses-crud — Supabase Edge Function
 *
 * Fronts apps/studio's poses feature (ai_poses table, each row belongs to
 * one ai_models row, PRD §7.3 v0.3). RLS is `authenticated_full_access`,
 * same as studio-models-crud, so this forwards the caller's own JWT.
 *
 * setBackView encodes a two-step business rule that used to live in the
 * Next.js component: at most one pose per model may be flagged
 * is_back_view (there's a partial unique index enforcing this in the DB
 * too) — marking a new pose as the back-view pose must first clear the
 * flag from whichever pose in the same model currently holds it. Moved
 * here instead of "update" so the client can't skip the clear step.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

async function listPoses(supabase: SupabaseClient, input: { model_id: string }) {
  const { data, error } = await supabase
    .from("ai_poses")
    .select("*")
    .eq("model_id", input.model_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

interface CreateInput {
  model_id: string;
  name: string;
  description: string | null;
  source: "vendor_archive" | "new_shoot" | "ai_generated";
  reference_image_url: string;
}

async function createPose(supabase: SupabaseClient, input: CreateInput) {
  const { data, error } = await supabase.from("ai_poses").insert(input).select().single();
  if (error) throw error;
  return data;
}

interface UpdateInput {
  id: string;
  patch: Partial<{
    name: string;
    description: string | null;
    source: CreateInput["source"];
    reference_image_url: string;
    is_active: boolean;
  }>;
}

async function updatePose(supabase: SupabaseClient, input: UpdateInput) {
  const { data, error } = await supabase
    .from("ai_poses")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deletePose(supabase: SupabaseClient, input: { id: string }) {
  const { error } = await supabase.from("ai_poses").delete().eq("id", input.id);
  if (error) throw error;
  return { ok: true };
}

async function setBackView(
  supabase: SupabaseClient,
  input: { id: string; model_id: string; value: boolean },
) {
  if (input.value) {
    const { error: clearErr } = await supabase
      .from("ai_poses")
      .update({ is_back_view: false })
      .eq("model_id", input.model_id)
      .eq("is_back_view", true)
      .neq("id", input.id);
    if (clearErr) throw clearErr;
  }
  const { data, error } = await supabase
    .from("ai_poses")
    .update({ is_back_view: input.value })
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

const handler = createActionHandler(
  {
    list: (input, { supabase }) => listPoses(supabase, input as { model_id: string }),
    create: (input, { supabase }) => createPose(supabase, input as CreateInput),
    update: (input, { supabase }) => updatePose(supabase, input as UpdateInput),
    remove: (input, { supabase }) => deletePose(supabase, input as { id: string }),
    setBackView: (input, { supabase }) =>
      setBackView(supabase, input as { id: string; model_id: string; value: boolean }),
  },
  getClient,
);

Deno.serve(handler);
