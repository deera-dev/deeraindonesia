// Sales hook: offline-first, sync ke Supabase saat online
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { displayName } from "@deera/shared/lib/auth";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { db } from "../lib/db";
import { applyStokLocal, applyStokToSupabase, deleteSaleFromSupabase } from "../lib/sync";

// ── Helper: bangun stok adjustments dari items ─────────────────────────────
function buildAdjustments(items, location, sign) {
  const adjs = [];
  for (const item of items) {
    if (item.warna?.length > 0) {
      for (const w of item.warna) {
        if (w.qty > 0)
          adjs.push({ kode: item.kode, size: item.size, warna: w.nama, location, delta: sign * w.qty });
      }
    }
  }
  return adjs;
}

// ── useSalesReport ─────────────────────────────────────────────────────────
// dateFilter bisa berupa:
//   "today"                   → hari ini
//   "week"                    → 7 hari terakhir
//   "month"                   → bulan ini (tanggal 1 s/d sekarang)
//   "year"                    → tahun ini (1 Jan s/d sekarang)
//   "YYYY-MM-DD"              → tanggal spesifik
//   "YYYY-MM-DD:YYYY-MM-DD"   → rentang dari–sampai
export function useSalesReport(dateFilter) {
  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    let all;

    if (dateFilter === "today") {
      all = await db.sales.where("date").equals(todayStr).reverse().sortBy("created_at");

    } else if (dateFilter === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      const from = d.toISOString().split("T")[0];
      all = await db.sales.where("date").between(from, todayStr, true, true).reverse().sortBy("created_at");

    } else if (dateFilter === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      const from = d.toISOString().split("T")[0];
      all = await db.sales.where("date").between(from, todayStr, true, true).reverse().sortBy("created_at");

    } else if (dateFilter === "year") {
      const from = `${now.getFullYear()}-01-01`;
      all = await db.sales.where("date").between(from, todayStr, true, true).reverse().sortBy("created_at");

    } else if (dateFilter.includes(":")) {
      // format "YYYY-MM-DD:YYYY-MM-DD"
      const [from, to] = dateFilter.split(":");
      all = await db.sales.where("date").between(from, to, true, true).reverse().sortBy("created_at");

    } else {
      // tanggal spesifik "YYYY-MM-DD"
      all = await db.sales.where("date").equals(dateFilter).reverse().sortBy("created_at");
    }

    setSales(all);
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);
  return { sales, loading, reload: load };
}

// ── useCreateSale ──────────────────────────────────────────────────────────
export function useCreateSale() {
  const { user } = useAuth();

  return async function createSale({ items, total, discount = 0, buyerName, buyerHp, pelangganId, location }) {
    const now = new Date();
    const loc  = location ?? getMarketLocation(now);
    const adjs = buildAdjustments(items, loc, -1);

    const sale = {
      date:             now.toISOString().split("T")[0],
      created_at:       now.toISOString(),
      type:             "sale",
      location:         loc,
      buyer_name:       buyerName   || null,
      buyer_hp:         buyerHp     || null,
      pelanggan_id:     pelangganId || null,
      items,
      discount,
      total,
      status:           "pending",
      stok_adjustments: adjs,
      created_by_email: user?.email ?? null,
      created_by_name:  displayName(user),
    };

    const localId = await db.sales.add(sale);
    await applyStokLocal(adjs);

    if (navigator.onLine) {
      try {
        const { id: _lid, status, supabase_id: _sid, ...payload } = { ...sale, id: localId };
        const { data, error } = await supabase.from("sales").insert(payload).select("id").single();
        if (!error) {
          await applyStokToSupabase(adjs);
          await db.sales.update(localId, { status: "synced", supabase_id: data?.id ?? null });
        }
      } catch { /* sync nanti */ }
    }

    return localId;
  };
}

// ── useCreateRetur — partial retur (items bisa sebagian) ────────────────────
export function useCreateRetur() {
  const { user } = useAuth();

  return async function createRetur({ originalSale, items, total }) {
    const now      = new Date();
    const location = originalSale.location ?? getMarketLocation(now);
    const adjs     = buildAdjustments(items, location, +1);

    const retur = {
      date:             now.toISOString().split("T")[0],
      created_at:       now.toISOString(),
      type:             "retur",
      location,
      buyer_name:       originalSale.buyer_name ?? null,
      buyer_hp:         originalSale.buyer_hp   ?? null,
      items,
      discount:         0,
      total,
      status:           "pending",
      stok_adjustments: adjs,
      created_by_email: user?.email ?? null,
      created_by_name:  displayName(user),
    };

    const localId = await db.sales.add(retur);
    await applyStokLocal(adjs);

    if (navigator.onLine) {
      try {
        const { id: _lid, status, supabase_id: _sid, ...payload } = { ...retur, id: localId };
        const { data, error } = await supabase.from("sales").insert(payload).select("id").single();
        if (!error) {
          await applyStokToSupabase(adjs);
          await db.sales.update(localId, { status: "synced", supabase_id: data?.id ?? null });
        }
      } catch { /* sync nanti */ }
    }

    return localId;
  };
}

// ── useUpdateSale ─────────────────────────────────────────────────────────
// Edit transaksi: ubah items, buyer, discount. Sync ke Supabase jika online.
export function useUpdateSale() {
  const { user } = useAuth();

  return async function updateSale(updatedSale) {
    // Hitung ulang total dari items yang tersisa
    const items = updatedSale.items ?? [];
    const subtotal = items.reduce((s, item) => {
      const qty = item.warna
        ? item.warna.reduce((ss, w) => ss + w.qty, 0)
        : (item.qty ?? 0);
      return s + qty * item.harga;
    }, 0);
    const discount = updatedSale.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

    // Catat riwayat edit
    const editEntry = {
      at: new Date().toISOString(),
      by: user?.email ?? "unknown",
      note: updatedSale._editNote ?? "Edit transaksi",
    };
    const editHistory = [...(updatedSale.edit_history ?? []), editEntry];

    const patch = {
      items,
      discount,
      total,
      buyer_name:   updatedSale.buyer_name   ?? null,
      buyer_hp:     updatedSale.buyer_hp     ?? null,
      edit_history: editHistory,
    };

    // Update IndexedDB
    await db.sales.update(updatedSale.id, patch);

    // Sync ke Supabase jika online dan sudah pernah sync
    if (navigator.onLine && updatedSale.supabase_id) {
      try {
        const { _editNote: _, id: _id, ...supabasePayload } = { ...updatedSale, ...patch };
        await supabase
          .from("sales")
          .update(supabasePayload)
          .eq("id", updatedSale.supabase_id);
      } catch { /* retry nanti */ }
    }
  };
}

// ── useDeleteSale ─────────────────────────────────────────────────────────
export function useDeleteSale() {
  return async function deleteSale(sale) {
    // Reverse stok lokal
    const reversed = (sale.stok_adjustments ?? []).map(a => ({ ...a, delta: -a.delta }));
    await applyStokLocal(reversed);

    // Hapus dari Supabase (jika sudah synced)
    if (sale.status === "synced") {
      await deleteSaleFromSupabase(sale).catch(err =>
        console.warn("[deleteSale] Supabase delete failed:", err.message)
      );
    }

    // Hapus dari IndexedDB
    await db.sales.delete(sale.id);
  };
}
