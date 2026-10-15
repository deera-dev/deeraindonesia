import { supabase } from "@deera/shared/lib/supabase";

/** Notifikasi milik user login (filter penerima & status baca dihitung di DB lewat RPC). */
export async function fetchMyNotifications(limit = 100) {
  const { data, error } = await supabase.rpc("get_my_notifications", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/** Tandai semua notifikasi sudah dilihat (disimpan di DB per user). */
export async function markNotificationsSeen() {
  const { error } = await supabase.rpc("mark_notifications_seen");
  if (error) throw error;
}
