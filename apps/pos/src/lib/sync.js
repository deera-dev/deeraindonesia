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
// Root cause race: clear() dan bulkPut() adalah dua transaksi Dexie terpisah.
// loadEnriched() yang dipanggil di antara keduanya akan membaca tabel kosong.
//
// Fix: bungkus clear+bulkPut dalam SATU transaksi Dexie ("rw") agar atomik —
// pembaca lain hanya bisa melihat state sebelum atau sesudah, tidak di tengah.
//
// Lock Promise: pastikan hanya satu fetch+write berjalan pada satu waktu.
let _syncStokPromise = null;

export function syncStok() {
  if (_syncStokPromise) return _syncStokPromise;

  _syncStokPromise = (async () => {
    const { data, error } = await supabase.from("stok_warna").select("*");
    if (error) throw error;
    const rows = data ?? [];

    // Transaksi tunggal: clear + bulkPut berjalan atomik.
    // Reader concurrent tidak bisa melihat tabel kosong di antara keduanya.
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

  let synced = 0,
    errors = 0;
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

// ── Sales: Supabase → IndexedDB (untuk transaksi dari admin lain) ───────────
// Set supabase_id yang sudah dihapus — dipersist ke localStorage agar
// tidak muncul kembali setelah page reload / sesi baru.
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
    /* ignore */
  }
}

const _deletedIds = _loadDeletedIds();

export function markSaleDeleted(supabaseId) {
  if (!supabaseId) return;
  _deletedIds.add(String(supabaseId));
  _saveDeletedIds(_deletedIds);
}

// Sync sales dari Supabase ke IndexedDB untuk rentang tanggal tertentu.
// Record yang pernah dihapus (tracked via _deletedIds di localStorage) di-skip.
// currentUserEmail tidak dipakai untuk filter — agar data bisa sync lintas browser/device.
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

    for (const remoteSale of data) {
      // Skip record yang pernah dihapus (ditandai via markSaleDeleted)
      if (_deletedIds.has(String(remoteSale.id))) continue;

      // Skip jika sudah ada di lokal
      const existing = await db.sales.where("supabase_id").equals(remoteSale.id).first();
      if (existing) continue;

      const { id: supabaseId, ...saleData } = remoteSale;
      await db.sales.add({
        ...saleData,
        supabase_id: supabaseId,
        status: "synced",
      });
    }
  } catch (err) {
    console.warn("[sync] syncSalesForRange failed:", err.message);
  }
}

// ── Delete sale dari Supabase ───────────────────────────────────────────────
// Melempar error jika gagal — caller harus handle agar delete lokal
// tidak terjadi jika Supabase delete belum berhasil.
export async function deleteSaleFromSupabase(sale) {
  if (!navigator.onLine) {
    throw new Error(
      "Tidak ada koneksi internet. Pastikan online untuk menghapus transaksi yang sudah tersync.",
    );
  }
  if (sale.supabase_id) {
    const { error } = await supabase.from("sales").delete().eq("id", sale.supabase_id);
    if (error) throw new Error(error.message ?? "Gagal hapus dari server");
  }
  // Reverse stok di Supabase — best-effort, tidak throw
  const reversed = (sale.stok_adjustments ?? []).map((a) => ({ ...a, delta: -a.delta }));
  if (reversed.length > 0) {
    await applyStokToSupabase(reversed);
  }
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
