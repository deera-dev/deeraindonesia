/**
 * features/profiles/api.js
 * Daftar user login (admin/pos/finance) — tabel `profiles`, otomatis terisi
 * lewat upsertProfile() di features/auth (lihat auth/hooks.js useAuth()).
 * Dipakai sbg sumber daftar @mention di fitur komentar Planning
 * (apps/admin/src/features/produksi-sampel, permintaan Denny 2026-09).
 */
import { supabase } from "../../lib/supabase";

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
