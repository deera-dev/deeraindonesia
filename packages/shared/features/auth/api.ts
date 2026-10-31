import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const DOMAIN = "@deera.id";

function toEmail(username: string): string {
  return username.trim().toLowerCase() + DOMAIN;
}

function toUsername(email: string | undefined | null): string {
  if (!email) return "-";
  return email.endsWith(DOMAIN) ? email.slice(0, -DOMAIN.length) : email;
}

export async function signIn(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Still calls Supabase directly (not the deployed `profiles` Edge
 * Function at supabase/functions/profiles/) - same deferred-cutover
 * reasoning as fetchProducts() in features/products/api.ts: no network
 * path in this sandbox to invoke and verify a live Edge Function's HTTP
 * response, so the actual client cutover waits for M2/a real browser
 * check. Already best-effort (errors swallowed) either way.
 */
export async function upsertProfile(user: User | null | undefined): Promise<void> {
  if (!user?.id || !user?.email) return;
  try {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || toUsername(user.email),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {}
}

export function displayName(user: User | null | undefined): string {
  if (!user) return "-";
  const name = user.user_metadata?.full_name || toUsername(user.email);
  return name ? name.toUpperCase() : "-";
}
