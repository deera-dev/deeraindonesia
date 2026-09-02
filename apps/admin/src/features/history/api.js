/**
 * features/history/api.js
 * Panggilan Supabase MENTAH untuk audit log (tabel product_history) — pure
 * async, tidak ada React di sini.
 *
 * logHistory dipanggil dari banyak fitur lain (produk, transfer, stok-opname,
 * buku-potongan, produksi-*) — import dari sini (layer api, bukan hooks),
 * konsisten dengan precedent packages/shared/features/transfers/api.js yang
 * import "../auth/api" untuk getCurrentUser/displayName.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { getCurrentUser, displayName } from "@deera/shared/features/auth/api";

/**
 * logHistory — catat satu event ke product_history. Best-effort: error hanya
 * di-warn, tidak pernah melempar — supaya gagal log tidak membatalkan aksi
 * utama (simpan produk, approve transfer, dst).
 *
 * @param {object} opts
 * @param {string} opts.action    — e.g. "tambah", "edit", "hapus", "transfer-buat", "stok-opname"
 * @param {string} opts.category  — "produk" | "transfer" | "stok" | "produksi"
 * @param {string} opts.kode      — kode produk atau nomor transfer
 * @param {string} opts.nama      — nama produk atau deskripsi singkat
 * @param {object} opts.snapshot  — state SETELAH perubahan
 * @param {object} [opts.before]  — state SEBELUM perubahan (opsional, untuk diff)
 */
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

// dateFrom/dateTo: "YYYY-MM-DD" | null. category: "all" | "produk" | "transfer" | "stok" | "produksi"
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

/**
 * fetchHistoryByKode — riwayat SATU item spesifik (kode unik: nomor sampel
 * "SPL-...", kode produk, nomor transfer, dst), TANPA limit 500 seperti
 * fetchHistory() karena sudah discope ke satu kode. Dipakai timeline
 * gabungan histori+komentar di Planning (produksi-sampel), permintaan
 * Denny 2026-09: "ada notif kalau ada yang bikin komen, intinya bisa
 * membantu untuk planing". Urutan ascending (lama→baru) supaya langsung
 * bisa digabung+diurut bareng sampel_comments jadi satu alur kronologis.
 */
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
