/**
 * features/riwayat/api.js — Raw I/O (Supabase) untuk fitur riwayat.
 * Tidak ada React di sini.
 *
 * `logActivity` dipakai juga oleh fitur lain (cross-feature, same-layer
 * import — lihat precedent `produksi-sampel/api.js` di apps/admin) untuk
 * mencatat aktivitas ke log audit bersama (tabel product_history), mis.
 * features/pelanggan/api.js memanggil `logActivity` dari sini.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { getCurrentUser, displayName } from "@deera/shared/features/auth/hooks";

// Kategori Supabase yang termasuk dalam filter tertentu
const CATEGORY_MAP = {
  pelanggan: ["pelanggan"],
  produk: ["produk"],
  stok: ["stok", "transfer"],
  produksi: ["produksi"],
};

/**
 * @param {object} opts
 * @param {string} opts.action    — e.g. "pelanggan-tambah", "pelanggan-edit"
 * @param {string} opts.category  — "pelanggan" | "produk" | "stok" | ...
 * @param {string} [opts.kode]    — id atau kode entitas
 * @param {string} [opts.nama]    — nama deskriptif
 * @param {object} [opts.snapshot]  — state SETELAH perubahan
 * @param {object} [opts.before]    — state SEBELUM perubahan
 */
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

// Audit produk/stok/transfer/produksi/pelanggan dari Supabase, untuk feed Riwayat.
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
