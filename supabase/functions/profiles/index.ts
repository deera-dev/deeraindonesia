/**
 * profiles — Supabase Edge Function
 *
 * Fronts packages/shared/features/auth/api.ts's upsertProfile() - the one
 * actual DATA write in the auth feature (not an auth.* call, so it's the
 * part that's in scope to move here; signIn/signOut/verifyPassword/
 * getCurrentUser stay direct supabase.auth.* calls per the reference
 * README's own Auth carve-out).
 *
 * `profiles` RLS restricts INSERT/UPDATE to `auth.uid() = id` (verified
 * live via pg_policies), so this forwards the CALLER'S OWN JWT rather than
 * using the anon key - the client runs as the calling user, RLS still
 * applies exactly as it does today, no privilege escalation.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

interface UpsertProfileInput {
  id: string;
  email: string;
  full_name: string | null;
}

async function upsertProfile(supabase: SupabaseClient, input: UpsertProfileInput) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: input.id,
      email: input.email,
      full_name: input.full_name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  return { ok: true };
}

const handler = createActionHandler(
  {
    upsert: (input, { supabase }) => upsertProfile(supabase, input as UpsertProfileInput),
  },
  getClient,
);

Deno.serve(handler);
