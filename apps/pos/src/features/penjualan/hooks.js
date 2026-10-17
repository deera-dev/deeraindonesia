import { useEffect, useState, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { db } from "../../lib/db";
import {
  applyStokLocal,
  applyStokToSupabase,
  deleteSaleFromSupabase,
  syncSalesForRange,
  markSaleDeleted,
  waitForPendingInsert,
} from "../../lib/sync";

function localDateStr(d = new Date()) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function buildAdjustments(items, fallbackLocation, sign) {
  const adjs = [];
  function pushBreakdown(kode, size, warna, qty, breakdown) {
    const bd =
      Array.isArray(breakdown) && breakdown.length > 0
        ? breakdown
        : [{ location: fallbackLocation, qty }];
    for (const b of bd) {
      if ((b.qty ?? 0) > 0) {
        adjs.push({ kode, size, warna, location: b.location, delta: sign * b.qty });
      }
    }
  }
  for (const item of items) {
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      for (const w of item.warna) {
        if ((w.qty ?? 0) > 0) pushBreakdown(item.kode, item.size, w.nama, w.qty, w.breakdown);
      }
    } else if ((item.qty ?? 0) > 0) {
      pushBreakdown(item.kode, item.size, "_", item.qty, item.breakdown);
    }
  }
  return adjs;
}

export async function splitPendingAdjustments(adjs, reversed = []) {
  const cache = new Map();
  const keyOf = (kode, size, warna, loc) => `${kode}|${size}|${warna}|${loc}`;
  async function get(kode, size, warna, loc) {
    const k = keyOf(kode, size, warna, loc);
    if (!cache.has(k)) {
      let v = 0;
      try {
        const row = await db.stok_warna.get([kode, size, warna]);
        v = row?.[loc] ?? 0;
      } catch {
        v = 0;
      }
      cache.set(k, v);
    }
    return cache.get(k);
  }
  for (const r of reversed) {
    const cur = await get(r.kode, r.size, r.warna, r.location);
    cache.set(keyOf(r.kode, r.size, r.warna, r.location), Math.max(0, cur + r.delta));
  }
  const out = [];
  for (const adj of adjs) {
    if (adj.delta >= 0 || adj.warna === "_") {
      out.push(adj);
      continue;
    }
    const need = -adj.delta;
    const own = await get(adj.kode, adj.size, adj.warna, adj.location);
    const short = Math.max(0, need - own);
    const pend = short > 0 ? await get(adj.kode, adj.size, "_", adj.location) : 0;
    const fromPending = Math.min(pend, short);
    const fromColor = need - fromPending;
    cache.set(keyOf(adj.kode, adj.size, adj.warna, adj.location), Math.max(0, own - fromColor));
    if (fromPending > 0) {
      cache.set(keyOf(adj.kode, adj.size, "_", adj.location), pend - fromPending);
    }
    if (fromColor > 0) out.push({ ...adj, delta: -fromColor });
    if (fromPending > 0) {
      out.push({ kode: adj.kode, size: adj.size, warna: "_", location: adj.location, delta: -fromPending });
    }
  }
  return out;
}

function buildReturnAdjustments(originalSale, returnItems, fallbackLocation) {
  const origAdjs = originalSale.stok_adjustments ?? [];
  const adjs = [];

  function distribute(kode, size, warna, qtyToReturn) {
    const matches = origAdjs.filter(
      (a) => a.kode === kode && a.size === size && a.warna === warna && a.delta < 0,
    );
    if (!matches.length) {
      adjs.push({ kode, size, warna, location: fallbackLocation, delta: qtyToReturn });
      return;
    }
    const totalOriginal = matches.reduce((s, a) => s + Math.abs(a.delta), 0);
    const shares = matches.map((a) => {
      const originalQty = Math.abs(a.delta);
      const raw = totalOriginal > 0 ? (originalQty / totalOriginal) * qtyToReturn : 0;
      return {
        location: a.location,
        cap: originalQty,
        floor: Math.min(originalQty, Math.floor(raw)),
        frac: raw - Math.floor(raw),
      };
    });
    let leftover = qtyToReturn - shares.reduce((s, x) => s + x.floor, 0);
    const order = [...shares].sort((a, b) => b.frac - a.frac);
    for (const s of order) {
      if (leftover <= 0) break;
      const room = s.cap - s.floor;
      if (room <= 0) continue;
      const add = Math.min(room, leftover);
      s.floor += add;
      leftover -= add;
    }
    for (const s of shares) {
      if (s.floor > 0) adjs.push({ kode, size, warna, location: s.location, delta: s.floor });
    }
    if (leftover > 0) {
      adjs.push({ kode, size, warna, location: fallbackLocation, delta: leftover });
    }
  }

  for (const item of returnItems) {
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      for (const w of item.warna) {
        if ((w.qty ?? 0) > 0) distribute(item.kode, item.size, w.nama, w.qty);
      }
    } else if ((item.qty ?? 0) > 0) {
      distribute(item.kode, item.size, "_", item.qty);
    }
  }
  return adjs;
}

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
    const adjs = await splitPendingAdjustments(buildAdjustments(items, loc, -1));

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

          supabase.functions
            .invoke("notify-sale", {
              body: { sale: { ...sale, id: data?.id }, createdBy: displayName(user) },
            })
            .catch(() => {
            });
        }
      } catch {
      }
    }

    return localId;
  };
}

export function useCreateRetur() {
  const { user } = useAuth();

  return async function createRetur({ originalSale, items, total }) {
    const now = new Date();
    const location = originalSale.location ?? getMarketLocation(now);
    const adjs = buildReturnAdjustments(originalSale, items, location);

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
      }
    }

    return localId;
  };
}

export function useUpdateSale() {
  const { user } = useAuth();

  return async function updateSale(updatedSale) {
    await waitForPendingInsert(updatedSale.id);

    const freshSale = (await db.sales.get(updatedSale.id)) ?? updatedSale;

    const items = updatedSale.items ?? [];
    const subtotal = items.reduce((s, item) => {
      const qty = Array.isArray(item.warna)
        ? item.warna.reduce((ss, w) => ss + (w.qty ?? 0), 0)
        : (item.qty ?? 0);

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

    const saleLocation = freshSale.location ?? updatedSale.location;
    const reversedOldAdjustments = (freshSale.stok_adjustments ?? []).map((a) => ({
      ...a,
      delta: -a.delta,
    }));
    const newAdjustments = await splitPendingAdjustments(
      buildAdjustments(items, saleLocation, -1),
      reversedOldAdjustments,
    );
    const stockDiff = [...reversedOldAdjustments, ...newAdjustments];

    const patch = {
      items,
      discount,
      total,
      buyer_name: updatedSale.buyer_name ?? null,
      buyer_hp: updatedSale.buyer_hp ?? null,
      edit_history: editHistory,
      stok_adjustments: newAdjustments,
    };

    if (freshSale.supabase_id) {
      if (!navigator.onLine) {
        throw new Error("Tidak ada koneksi internet. Sambungkan internet lalu coba edit lagi.");
      }

      const supabasePayload = {
        items,
        discount,
        total,
        buyer_name: updatedSale.buyer_name ?? null,
        buyer_hp: updatedSale.buyer_hp ?? null,
        edit_history: editHistory,
        stok_adjustments: newAdjustments,
      };

      const { data, error } = await supabase
        .from("sales")
        .update(supabasePayload)
        .eq("id", freshSale.supabase_id)
        .select("id");

      if (error) throw new Error(error.message ?? "Gagal update di server");

      if (!data || data.length === 0) {
        throw new Error(
          "Server tidak mengubah baris ini (0 baris terpengaruh) — kemungkinan policy UPDATE pada tabel sales menolak.",
        );
      }

      if (stockDiff.length > 0) await applyStokToSupabase(stockDiff);
    }

    if (stockDiff.length > 0) await applyStokLocal(stockDiff);

    await db.sales.update(freshSale.id, patch);
  };
}

export function useDeleteSale() {
  return async function deleteSale(sale) {
    await waitForPendingInsert(sale.id);

    const freshSale = (await db.sales.get(sale.id)) ?? sale;

    const reversed = (freshSale.stok_adjustments ?? []).map((a) => ({ ...a, delta: -a.delta }));

    if (freshSale.supabase_id) {
      if (!navigator.onLine) {
        throw new Error("Tidak ada koneksi internet. Sambungkan internet lalu coba hapus lagi.");
      }
      await deleteSaleFromSupabase(freshSale);
    }

    await db.sales.delete(freshSale.id);

    markSaleDeleted(freshSale.supabase_id);

    await applyStokLocal(reversed);
  };
}
