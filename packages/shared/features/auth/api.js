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

/**
 * upsertProfile — sinkron baris `profiles` (id/email/full_name) tiap kali
 * sesi user berhasil dikenali (lihat hooks.js useAuth()). App ini sebelumnya
 * TIDAK punya daftar user manapun (login cuma via Supabase Auth) — tabel
 * `profiles` ini jadi sumber daftar @mention di fitur komentar Planning
 * (produksi-sampel, permintaan Denny 2026-09). Best-effort & fire-and-forget
 * (dipanggil tanpa await di hooks.js) — kalau gagal, @mention cukup pakai
 * data yang sudah ada, tidak boleh sampai memblokir login.
 */
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
  } catch {
    // best-effort, lihat komentar di atas
  }
}

// Nama tampilan: pakai full_name dari metadata, fallback ke username
// Selalu uppercase agar konsisten di seluruh aplikasi
export function displayName(user) {
  if (!user) return "-";
  const name = user.user_metadata?.full_name || toUsername(user.email);
  return name ? name.toUpperCase() : "-";
}
