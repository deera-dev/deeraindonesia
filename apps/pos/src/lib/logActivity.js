/**
 * logActivity.js — Catat aktivitas ke tabel product_history.
 *
 * Dipakai oleh POS untuk mencatat perubahan pelanggan agar muncul
 * di halaman Riwayat bersama audit dari admin.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { getCurrentUser, displayName } from "@deera/shared/lib/auth";

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
