import { supabase } from "@deera/shared/lib/supabase";
import { db } from "./db";

let _syncProductsPromise = null;

export function syncProducts() {
  if (_syncProductsPromise) return _syncProductsPromise;

  _syncProductsPromise = (async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .order("nama", { ascending: true });
    if (error) throw error;
    const rows = data ?? [];

    await db.transaction("rw", db.products, async () => {
      await db.products.clear();
      await db.products.bulkPut(rows);
    });

    return rows;
  })()
    .catch((err) => {
      console.warn("[sync] syncProducts failed:", err.message);
      throw err;
    })
    .finally(() => {
      _syncProductsPromise = null;
    });

  return _syncProductsPromise;
}

let _syncStokPromise = null;

export function syncStok() {
  if (_syncStokPromise) return _syncStokPromise;

  _syncStokPromise = (async () => {
    const { data, error } = await supabase.from("stok_warna").select("*");
    if (error) throw error;
    const rows = data ?? [];

    await db.transaction("rw", db.stok_warna, async () => {
      await db.stok_warna.clear();
      await db.stok_warna.bulkPut(rows);
    });

    return rows;
  })()
    .catch((err) => {
      console.warn("[sync] syncStok failed:", err.message);
      throw err;
    })
    .finally(() => {
      _syncStokPromise = null;
    });

  return _syncStokPromise;
}

export async function applyStokToSupabase(adjustments) {
  for (const adj of adjustments) {
    try {
      const { data } = await supabase
        .from("stok_warna")
        .select(adj.location)
        .eq("kode", adj.kode)
        .eq("size", adj.size)
        .eq("warna", adj.warna)
        .single();

      const current = data?.[adj.location] ?? 0;
      const newVal = Math.max(0, current + adj.delta);

      await supabase
        .from("stok_warna")
        .update({ [adj.location]: newVal, updated_at: new Date().toISOString() })
        .eq("kode", adj.kode)
        .eq("size", adj.size)
        .eq("warna", adj.warna);
    } catch (err) {
      console.warn("[sync] applyStok failed for", adj, err.message);
    }
  }
}

export async function applyStokLocal(adjustments) {
  for (const adj of adjustments) {
    try {
      const row = await db.stok_warna.get([adj.kode, adj.size, adj.warna]);
      if (row) {
        const newVal = Math.max(0, (row[adj.location] ?? 0) + adj.delta);
        await db.stok_warna.update([adj.kode, adj.size, adj.warna], {
          [adj.location]: newVal,
        });
      }
    } catch (err) {
      console.warn("[sync] applyStokLocal failed for", adj, err.message);
    }
  }
}

const _inFlightInserts = new Map();

export function waitForPendingInsert(localSaleId) {
  return _inFlightInserts.get(localSaleId) ?? Promise.resolve();
}

export async function flushPendingSales() {
  const pending = await db.sales.where("status").equals("pending").toArray();
  if (pending.length === 0) return { synced: 0, errors: 0 };

  let synced = 0,
    errors = 0;
  for (const sale of pending) {
    const insertPromise = (async () => {
      try {
        const { id: localId, status, supabase_id: _sid, ...payload } = sale;
        const { data, error } = await supabase.from("sales").insert(payload).select("id").single();
        if (error) throw error;

        if (sale.stok_adjustments?.length > 0) {
          await applyStokToSupabase(sale.stok_adjustments);
        }

        await db.sales.update(localId, { status: "synced", supabase_id: data?.id ?? null });
        synced++;
      } catch (err) {
        await db.sales.update(sale.id, { status: "error", error_msg: err.message });
        errors++;
      }
    })();
    _inFlightInserts.set(sale.id, insertPromise);
    try {
      await insertPromise;
    } finally {
      _inFlightInserts.delete(sale.id);
    }
  }
  return { synced, errors };
}

const LS_DELETED = "deera_deleted_sale_ids";

function _loadDeletedIds() {
  try {
    const raw = localStorage.getItem(LS_DELETED);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function _saveDeletedIds(set) {
  try {
    localStorage.setItem(LS_DELETED, JSON.stringify([...set]));
  } catch {
  }
}

const _deletedIds = _loadDeletedIds();

export function markSaleDeleted(supabaseId) {
  if (!supabaseId) return;
  _deletedIds.add(String(supabaseId));
  _saveDeletedIds(_deletedIds);
}

export async function syncSalesForRange(from, to, currentUserEmail) {
  if (!navigator.onLine) return;
  try {
    let query = supabase.from("sales").select("*");
    if (from === to) {
      query = query.eq("date", from);
    } else {
      query = query.gte("date", from).lte("date", to);
    }
    const { data, error } = await query;
    if (error || !data) return;

    const remoteIds = new Set(data.map((s) => String(s.id)));

    let localForRange;
    if (from === to) {
      localForRange = await db.sales.where("date").equals(from).toArray();
    } else {
      localForRange = await db.sales.where("date").between(from, to, true, true).toArray();
    }
    for (const local of localForRange) {
      if (local.supabase_id && !remoteIds.has(String(local.supabase_id))) {
        await db.sales.delete(local.id);
        markSaleDeleted(local.supabase_id);
      }
    }

    for (const remoteSale of data) {
      if (_deletedIds.has(String(remoteSale.id))) continue;

      await db.transaction("rw", db.sales, async () => {
        const existing = await db.sales.where("supabase_id").equals(remoteSale.id).first();
        if (existing) return;

        const { id: supabaseId, ...saleData } = remoteSale;
        await db.sales.add({
          ...saleData,
          supabase_id: supabaseId,
          status: "synced",
        });
      });
    }
  } catch (err) {
    console.warn("[sync] syncSalesForRange failed:", err.message);
  }
}

export async function deleteSaleFromSupabase(sale) {
  if (!navigator.onLine) {
    throw new Error(
      "Tidak ada koneksi internet. Pastikan online untuk menghapus transaksi yang sudah tersync.",
    );
  }
  if (sale.supabase_id) {
    const { data, error } = await supabase
      .from("sales")
      .delete()
      .eq("id", sale.supabase_id)
      .select("id");
    if (error) throw new Error(error.message ?? "Gagal hapus dari server");
    if (!data || data.length === 0) {
      throw new Error(
        "Server tidak menghapus baris ini (0 baris terpengaruh) — kemungkinan policy akses (RLS) di Supabase menolak. Cek policy DELETE pada tabel sales.",
      );
    }
  }
  const reversed = (sale.stok_adjustments ?? []).map((a) => ({ ...a, delta: -a.delta }));
  if (reversed.length > 0) {
    await applyStokToSupabase(reversed);
  }
}

export async function syncPelanggan() {
  try {
    const { data, error } = await supabase
      .from("pelanggan")
      .select("*")
      .order("nama", { ascending: true });
    if (error) throw error;
    await db.pelanggan.clear();
    await db.pelanggan.bulkPut(data ?? []);
    return data ?? [];
  } catch (err) {
    console.warn("[sync] syncPelanggan failed:", err.message);
    return [];
  }
}

export async function initSync() {
  if (!navigator.onLine) return;
  await Promise.all([syncProducts(), syncStok(), syncPelanggan()]);
  await flushPendingSales();
}
