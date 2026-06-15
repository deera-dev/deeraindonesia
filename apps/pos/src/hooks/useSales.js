// Sales hook: offline-first, sync ke Supabase saat online
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { displayName } from "@deera/shared/lib/auth";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { db } from "../lib/db";
import {
  applyStokLocal,
  applyStokToSupabase,
  deleteSaleFromSupabase,
  syncSalesForRange,
  markSaleDeleted,
} from "../lib/sync";

// Format tanggal lokal (bukan UTC) supaya midnight–7am WIB tidak masuk tanggal kemarin.
function localDateStr(d = new Date()) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}


// Helper: bangun stok adjustments dari items
function buildAdjustments(items, location, sign) {
  const adjs = [];
  for (const item of items) {
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      for (const w of item.warna) {
        if ((w.qty ?? 0) > 0)
          adjs.push({
            kode: item.kode,
            size: item.size,
            warna: w.nama,
            location,
            delta: sign * w.qty,
          });
      }
    }
  }
  return adjs;
}

// useSalesReport
// dateFilter bisa berupa:
//   "today"                   - hari ini
//   "week"                    - 7 hari terakhir
//   "month"                   - bulan ini (tanggal 1 s/d sekarang)
//   "year"                    - tahun ini (1 Jan s/d sekarang)
//   "YYYY-MM-DD"              - tanggal spesifik
//   "YYYY-MM-DD:YYYY-MM-DD"   - rentang dari-sampai
export function useSalesReport(dateFilter) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  function resolveDates() {
    const now = new Date();
    const todayStr = localDateStr(now);
    let from, to;
    if (dateFilter === "today") {
      from = to = todayStr;
    } else if (dateFilter === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = localDateStr(d);
      to = todayStr;
    } else if (dateFilter === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      from = localDateStr(d);
      to = todayStr;
    } else if (dateFilter === "year") {
      from = `${now.getFullYear()}-01-01`;
      to = todayStr;
    } else if (dateFilter.includes(":")) {
      [from, to] = dateFilter.split(":");
    } else {
      from = to = dateFilter;
    }
    return { from, to };
  }

  // Baca dari IndexedDB lokal saja (tanpa sync ke Supabase).
  // Dipakai setelah aksi lokal (hapus / retur / edit) agar record yang baru
  // dihapus tidak di-fetch ulang dari Supabase.
  const reload = useCallback(async () => {
    const { from, to } = resolveDates();
    let all;
    if (from === to) {
      all = await db.sales.where("date").equals(from).reverse().sortBy("created_at");
    } else {
      all = await db.sales
        .where("date")
        .between(from, to, true, true)
        .reverse()
        .sortBy("created_at");
    }
    setSales(all);
  }, [dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync dari Supabase lalu baca lokal.
  // Hanya dipanggil saat filter berubah atau halaman pertama kali dibuka.
  // Tidak dipanggil setelah aksi delete/retur/edit (gunakan reload()).
  const syncAndLoad = useCallback(async () => {
    setLoading(true);
    const { from, to } = resolveDates();
    if (navigator.onLine) {
      await syncSalesForRange(from, to, user?.email ?? null);
    }
    let all;
    if (from === to) {
      all = await db.sales.where("date").equals(from).reverse().sortBy("created_at");
    } else {
      all = await db.sales
        .where("date")
        .between(from, to, true, true)
        .reverse()
        .sortBy("created_at");
    }
    setSales(all);
    setLoading(false);
  }, [dateFilter, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    syncAndLoad();
  }, [syncAndLoad]);

  return { sales, loading, reload };
}

// useCreateSale
export function useCreateSale() {
  const { user } = useAuth();

  return async function createSale({
    items,
    total,
    discount = 0,
    buyerName,
    buyerHp,
    pelangganId,
    location,
  }) {
    const now = new Date();
    const loc = location ?? getMarketLocation(now);
    const adjs = buildAdjustments(items, loc, -1);

    const sale = {
      date: localDateStr(now),
      created_at: now.toISOString(),
      type: "sale",
      location: loc,
      buyer_name: buyerName || null,
      buyer_hp: buyerHp || null,
      pelanggan_id: pelangganId || null,
      items,
      discount,
      total,
      status: "pending",
      stok_adjustments: adjs,
      created_by_email: user?.email ?? null,
      created_by_name: displayName(user),
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

          // Kirim push notification ke semua device terdaftar (best-effort)
          supabase.functions
            .invoke("notify-sale", {
              body: { sale: { ...sale, id: data?.id }, createdBy: displayName(user) },
            })
            .catch(() => { /* silent — jangan blokir transaksi */ });
        }
      } catch {
        /* sync nanti */
      }
    }

    return localId;
  };
}

// useCreateRetur - partial retur (items bisa sebagian)
export function useCreateRetur() {
  const { user } = useAuth();

  return async function createRetur({ originalSale, items, total }) {
    const now = new Date();
    const location = originalSale.location ?? getMarketLocation(now);
    const adjs = buildAdjustments(items, location, +1);

    const retur = {
      date: localDateStr(now),
      created_at: now.toISOString(),
      type: "retur",
      location,
      buyer_name: originalSale.buyer_name ?? null,
      buyer_hp: originalSale.buyer_hp ?? null,
      items,
      discount: 0,
      total,
      status: "pending",
      stok_adjustments: adjs,
      created_by_email: user?.email ?? null,
      created_by_name: displayName(user),
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
      } catch {
        /* sync nanti */
      }
    }

    return localId;
  };
}

// useUpdateSale
// Edit transaksi: ubah items, buyer, discount. Sync ke Supabase jika online.
export function useUpdateSale() {
  const { user } = useAuth();

  return async function updateSale(updatedSale) {
    const items = updatedSale.items ?? [];
    const subtotal = items.reduce((s, item) => {
      const qty = Array.isArray(item.warna) ? item.warna.reduce((ss, w) => ss + (w.qty ?? 0), 0) : (item.qty ?? 0);
      return s + qty * item.harga;
    }, 0);
    const discount = updatedSale.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

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
      buyer_name: updatedSale.buyer_name ?? null,
      buyer_hp: updatedSale.buyer_hp ?? null,
      edit_history: editHistory,
    };

    await db.sales.update(updatedSale.id, patch);

    if (navigator.onLine && updatedSale.supabase_id) {
      try {
        const { _editNote: _, id: _id, ...supabasePayload } = { ...updatedSale, ...patch };
        await supabase.from("sales").update(supabasePayload).eq("id", updatedSale.supabase_id);
      } catch {
        /* retry nanti */
      }
    }
  };
}

// useDeleteSale
export function useDeleteSale() {
  return async function deleteSale(sale) {
    // Baca ulang dari IndexedDB agar status & supabase_id selalu fresh.
    // Objek `sale` dari React state bisa stale: sale.status === "pending"
    // padahal IndexedDB sudah "synced" setelah background flushPendingSales().
    const freshSale = (await db.sales.get(sale.id)) ?? sale;

    const reversed = (freshSale.stok_adjustments ?? []).map((a) => ({ ...a, delta: -a.delta }));

    if (freshSale.status === "synced") {
      // Hapus dari Supabase dulu - throw jika gagal agar lokal tidak terhapus
      await deleteSaleFromSupabase(freshSale);
    } else if (navigator.onLine && freshSale.supabase_id) {
      // Status "pending" tapi supabase_id sudah ada
      // (bisa terjadi jika flushPendingSales berhasil insert tapi gagal update lokal)
      // Coba hapus dari Supabase - abaikan error agar delete lokal tetap lanjut
      try {
        await deleteSaleFromSupabase(freshSale);
      } catch (err) {
        console.warn("[delete] Supabase cleanup skipped:", err.message);
      }
    }

    // Hapus dari IndexedDB
    await db.sales.delete(freshSale.id);

    // Tandai supabase_id sebagai deleted agar syncSalesForRange tidak insert ulang
    markSaleDeleted(freshSale.supabase_id);

    // Reverse stok lokal (best-effort)
    await applyStokLocal(reversed);
  };
}
