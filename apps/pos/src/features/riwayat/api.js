import { supabase } from "@deera/shared/lib/supabase";
import { getCurrentUser, displayName } from "@deera/shared/features/auth/hooks";

const CATEGORY_MAP = {
  pelanggan: ["pelanggan"],
  produk: ["produk"],
  stok: ["stok", "transfer"],
  produksi: ["produksi"],
};

export async function logActivity({
  action,
  category = "produk",
  kode = "",
  nama = "",
  snapshot = null,
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
    console.warn("logActivity error:", err);
  }
}

export async function fetchProductHistory({ dateFrom, dateTo, category }) {
  let q = supabase
    .from("product_history")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(300);

  if (dateFrom) q = q.gte("changed_at", dateFrom + "T00:00:00.000Z");
  if (dateTo) q = q.lte("changed_at", dateTo + "T23:59:59.999Z");
  if (category !== "semua" && CATEGORY_MAP[category]) {
    q = q.in("category", CATEGORY_MAP[category]);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
