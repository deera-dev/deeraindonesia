import { useCallback, useEffect, useState } from "react";
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
            total: s.total,
            discount: s.discount,
            location: s.location,
            buyer_name: s.buyer_name,
            buyer_hp: s.buyer_hp,
            items: s.items ?? [],
            stok_adjustments: s.stok_adjustments ?? [],
          });
        });
      }

      if (category !== "transaksi") {
        const data = await fetchProductHistory({ dateFrom, dateTo, category });
        data.forEach((row) => {
          result.push({ ...row, _id: row.id, _type: "history" });
        });
      }

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
