import { supabase } from "@deera/shared/lib/supabase";

export async function fetchMyNotifications(limit = 100) {
  const { data, error } = await supabase.rpc("get_my_notifications", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationsSeen() {
  const { error } = await supabase.rpc("mark_notifications_seen");
  if (error) throw error;
}

export async function markNotificationRead(id) {
  const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
  if (error) throw error;
}
