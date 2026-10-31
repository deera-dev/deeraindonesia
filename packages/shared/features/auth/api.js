import { supabase } from "../../lib/supabase";

const DOMAIN = "@deera.id";

function toEmail(username) {
  return username.trim().toLowerCase() + DOMAIN;
}

function toUsername(email) {
  if (!email) return "-";
  return email.endsWith(DOMAIN) ? email.slice(0, -DOMAIN.length) : email;
}

export async function signIn(username, password) {
  return supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function verifyPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function upsertProfile(user) {
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

export function displayName(user) {
  if (!user) return "-";
  const name = user.user_metadata?.full_name || toUsername(user.email);
  return name ? name.toUpperCase() : "-";
}
