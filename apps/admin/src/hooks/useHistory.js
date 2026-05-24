import { useEffect, useState, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { getCurrentUser, displayName } from "@deera/shared/lib/auth";

/**
 * logHistory — catat satu event ke product_history
 *
 * @param {object} opts
 * @param {string} opts.action    — e.g. "tambah", "edit", "hapus", "transfer-buat", "stok-opname"
 * @param {string} opts.category  — "produk" | "transfer" | "stok"
 * @param {string} opts.kode      — kode produk atau nomor transfer
 * @param {string} opts.nama      — nama produk atau deskripsi singkat
 * @param {object} opts.snapshot  — state SETELAH perubahan
 * @param {object} [opts.before]  — state SEBELUM perubahan (opsional, untuk diff)
 */
export async function logHistory({ action, category = "produk", kode, nama, snapshot, before = null }) {
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
      user_name:  displayName(user),
    });
  } catch (err) {
    console.warn("logHistory error:", err);
  }
}

/**
 * useHistory — fetch riwayat dengan filter tanggal + kategori
 *
 * @param {object} opts
 * @param {string|null} opts.dateFrom   — "YYYY-MM-DD" | null
 * @param {string|null} opts.dateTo     — "YYYY-MM-DD" | null
 * @param {string}      opts.category   — "all" | "produk" | "transfer" | "stok"
 */
export function useHistory({ dateFrom = null, dateTo = null, category = "all" } = {}) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("product_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(500);

      if (category && category !== "all") {
        q = q.eq("category", category);
      }
      if (dateFrom) q = q.gte("changed_at", `${dateFrom}T00:00:00`);
      if (dateTo)   q = q.lte("changed_at", `${dateTo}T23:59:59`);

      const { data, error: err } = await q;
      if (err) throw err;
      setHistory(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, category]);

  useEffect(() => { load(); }, [load]);

  return { history, loading, error, reload: load };
}

/**
 * deleteHistory — hapus satu entri riwayat berdasarkan id
 */
export async function deleteHistory(id) {
  const { error } = await supabase
    .from("product_history")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
