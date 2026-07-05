/**
 * features/auth/api.js
 * Panggilan Supabase Auth MENTAH — pure async functions, tidak ada React di sini.
 * "Modul level-rendah" — jangan diimport langsung oleh komponen, lewat hooks.js.
 */
import { supabase } from "../../lib/supabase";

const DOMAIN = "@deera.id";

// Username → fake internal email
function toEmail(username) {
  return username.trim().toLowerCase() + DOMAIN;
}

// Internal email → username
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

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Nama tampilan: pakai full_name dari metadata, fallback ke username
// Selalu uppercase agar konsisten di seluruh aplikasi
export function displayName(user) {
  if (!user) return "-";
  const name = user.user_metadata?.full_name || toUsername(user.email) || "-";
  return name.toUpperCase();
}
