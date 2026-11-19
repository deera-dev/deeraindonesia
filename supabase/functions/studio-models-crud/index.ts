/**
 * studio-models-crud — Supabase Edge Function
 *
 * Fronts apps/studio's models feature (ai_models table — AI Fashion Studio
 * reference models, no LoRA training, PRD v0.3 §7.2). `ai_models` RLS is
 * `authenticated_full_access` (any logged-in user, full CRUD) - same shape
 * as `profiles`, so this forwards the CALLER'S OWN JWT rather than the
 * service role. No privilege escalation: RLS applies exactly as it does
 * today via direct client calls.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

interface ListInput {
  onlyActive?: boolean;
}

async function listModels(supabase: SupabaseClient, input: ListInput) {
  let query = supabase.from("ai_models").select("*");
  query = input?.onlyActive
    ? query.eq("is_active", true).order("name", { ascending: true })
    : query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

interface CreateInput {
  name: string;
  thumbnail_url: string | null;
}

async function createModel(supabase: SupabaseClient, input: CreateInput) {
  const { data, error } = await supabase
    .from("ai_models")
    .insert({ name: input.name, thumbnail_url: input.thumbnail_url })
    .select()
    .single();
  if (error) throw error;
  return data;
}

interface UpdateInput {
  id: string;
  patch: Partial<{ name: string; thumbnail_url: string | null; is_active: boolean }>;
}

async function updateModel(supabase: SupabaseClient, input: UpdateInput) {
  const { data, error } = await supabase
    .from("ai_models")
    .update(input.patch)
    .eq("id", input.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteModel(supabase: SupabaseClient, input: { id: string }) {
  const { error } = await supabase.from("ai_models").delete().eq("id", input.id);
  if (error) throw error;
  return { ok: true };
}

const handler = createActionHandler(
  {
    list: (input, { supabase }) => listModels(supabase, input as ListInput),
    create: (input, { supabase }) => createModel(supabase, input as CreateInput),
    update: (input, { supabase }) => updateModel(supabase, input as UpdateInput),
    remove: (input, { supabase }) => deleteModel(supabase, input as { id: string }),
  },
  getClient,
);

Deno.serve(handler);
