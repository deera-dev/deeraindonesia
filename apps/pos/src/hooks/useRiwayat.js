/**
 * useRiwayat.js — Hook untuk halaman Riwayat POS.
 *
 * Menggabungkan dua sumber data:
 *   1. product_history (Supabase) — audit produk, stok, transfer, pelanggan, produksi
 *   2. sales (IndexedDB / Dexie)  — transaksi penjualan & retur POS
 *
 * Output: array item ternormalisasi, diurutkan dari terbaru ke terlama.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { db } from "../lib/db";
import { presetToDates } from "../components/riwayat/riwayatUtils";

// Kategori Supabase yang termasuk dalam filter tertentu
const CATEGORY_MAP = {
  pelanggan: ["pelanggan"],
  produk: ["produk"],
  stok: ["stok", "transfer"],
  produksi: ["produksi"],
};

export function useRiwayat({ preset = "week", category = "semua" } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { dateFrom, dateTo } = presetToDates(preset);
      const result = [];

      // ── 1. Transaksi dari IndexedDB ────────────────────────────────────────
      if (category === "semua" || category === "transaksi") {
        let q = db.sales.orderBy("date").reverse();
        if (dateFrom) q = q.filter((s) => s.date >= dateFrom);
        if (dateTo) q = q.filter((s) => s.date <= dateTo);
        const sales = await q.toArray();

        sales.forEach((s) => {
          result.push({
            _id: String(s.id),
            _type: "sale",
            changed_at: s.created_at,
            action: s.type ?? "sale",
            category: "transaksi",
            kode: String(s.id),
            nama: s.buyer_name || "Tanpa nama",
            user_name: s.created_by_name || s.created_by_email || "",
            // Extra untuk tampilan
            total: s.total,
            discount: s.discount,
            location: s.location,
            buyer_name: s.buyer_name,
            buyer_hp: s.buyer_hp,
            items: s.items ?? [],
          });
        });
      }

      // ── 2. Product history dari Supabase ───────────────────────────────────
      if (category !== "transaksi") {
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

        const { data, error: fetchErr } = await q;
        if (fetchErr) throw fetchErr;

        (data ?? []).forEach((row) => {
          result.push({ ...row, _id: row.id, _type: "history" });
        });
      }

      // ── 3. Sort gabungan terbaru → terlama ─────────────────────────────────
      result.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
      setItems(result);
    } catch (err) {
      setError(err.message ?? "Gagal memuat riwayat");
    }
    setLoading(false);
  }, [preset, category]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}
