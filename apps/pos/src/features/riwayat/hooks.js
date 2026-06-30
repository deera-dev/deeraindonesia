/**
 * features/riwayat/hooks.js — Public surface fitur riwayat (Dependency
 * Inversion ala React: komponen import HANYA dari sini / index.js).
 *
 * Menggabungkan dua sumber data:
 *   1. product_history (Supabase, via api.js) — audit produk, stok,
 *      transfer, pelanggan, produksi
 *   2. sales (IndexedDB / Dexie)               — transaksi penjualan & retur
 *
 * Plain hook (bukan TanStack Query) — sejalan dengan keputusan yang sama
 * untuk features/penjualan, karena sebagian sumbernya adalah Dexie, bukan
 * cache react-query.
 */
import { useState, useEffect, useCallback } from "react";
import { db } from "../../lib/db";
import { fetchProductHistory } from "./api";
import { presetToDates } from "./utils";

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
        const data = await fetchProductHistory({ dateFrom, dateTo, category });
        data.forEach((row) => {
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
