import { supabase } from "@deera/shared/lib/supabase";
import { getCurrentUser, displayName } from "@deera/shared/features/auth/api";

export async function logHistory({
  action,
  category = "produk",
  kode,
  nama,
  snapshot,
  before = null,
}) {
  try {
    const user = await getCurrentUser();
    await supabase.from("product_history").insert({
      action,
      category,
      kode,
      nama,
      snapshot,
      before_snapshot: before,
      user_email: user?.email ?? null,
      user_name: displayName(user),
    });
  } catch (err) {
    console.warn("logHistory error:", err);
  }
}

export async function fetchHistory({ dateFrom = null, dateTo = null, category = "all" } = {}) {
  let q = supabase
    .from("product_history")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(500);

  if (category && category !== "all") {
    q = q.eq("category", category);
  }
  if (dateFrom) q = q.gte("changed_at", `${dateFrom}T00:00:00`);
  if (dateTo) q = q.lte("changed_at", `${dateTo}T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchHistoryByKode(kode) {
  if (!kode) return [];
  const { data, error } = await supabase
    .from("product_history")
    .select("*")
    .eq("kode", kode)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function deleteHistoryEntry(id) {
  const { error } = await supabase.from("product_history").delete().eq("id", id);
  if (error) throw error;
}
