// Sync logic: Supabase ↔ local IndexedDB
import { supabase } from "@deera/shared/lib/supabase";
import { db } from "./db";

// ── Products: Supabase → IndexedDB ─────────────────────────────────────────
export async function syncProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    await db.products.clear();
    await db.products.bulkPut(data ?? []);
    return data ?? [];
  } catch (err) {
    console.warn("[sync] syncProducts failed:", err.message);
    throw err;
  }
}

// ── Stok warna: Supabase → IndexedDB ───────────────────────────────────────
export async function syncStok() {
  try {
    const { data, error } = await supabase.from("stok_warna").select("*");
    if (error) throw error;
    await db.stok_warna.clear();
    await db.stok_warna.bulkPut(data ?? []);
    return data ?? [];
  } catch (err) {
    console.warn("[sync] syncStok failed:", err.message);
    throw err;
  }
}

// ── Stok adjustment: apply ke Supabase (best-effort) ───────────────────────
// adjustments: [{kode, size, warna, location, delta}]
export async function applyStokToSupabase(adjustments) {
  for (const adj of adjustments) {
    try {
      // Ambil nilai sekarang
      const { data } = await supabase
        .from("stok_warna")
        .select(adj.location)
        .eq("kode", adj.kode)
        .eq("size", adj.size)
        .eq("warna", adj.warna)
        .single();

      const current = data?.[adj.location] ?? 0;
      const newVal  = Math.max(0, current + adj.delta);

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

// ── Stok adjustment: apply ke IndexedDB lokal ──────────────────────────────
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

// ── Sales: IndexedDB pending → Supabase ────────────────────────────────────
export async function flushPendingSales() {
  const pending = await db.sales.where("status").equals("pending").toArray();
  if (pending.length === 0) return { synced: 0, errors: 0 };

  let synced = 0, errors = 0;
  for (const sale of pending) {
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
  }
  return { synced, errors };
}

// ── Delete sale dari Supabase ───────────────────────────────────────────────
export async function deleteSaleFromSupabase(sale) {
  if (!navigator.onLine) return;
  if (sale.supabase_id) {
    await supabase.from("sales").delete().eq("id", sale.supabase_id);
  }
  // Reverse stok adjustments di Supabase
  const reversed = (sale.stok_adjustments ?? []).map(a => ({ ...a, delta: -a.delta }));
  if (reversed.length > 0) await applyStokToSupabase(reversed);
}

// ── Pelanggan: Supabase → IndexedDB ────────────────────────────────────────
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

// ── Init: dipanggil saat app start & saat online ────────────────────────────
// Throws on error — caller is responsible for catching and showing feedback.
export async function initSync() {
  if (!navigator.onLine) return;
  await Promise.all([syncProducts(), syncStok(), syncPelanggan()]);
  await flushPendingSales();
}
