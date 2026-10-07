/**
 * features/keep/api.js — Supabase mentah utk tabel keep_orders
 * (lihat supabase/migrations/20261007_keep_orders.sql). Keep butuh internet
 * (beda dgn transaksi biasa yg offline-first) krn tidak menyentuh stok lokal.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { localDateStr } from "./utils";

const TABLE = "keep_orders";

export async function fetchKeepOrders() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "aktif")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createKeepOrder({ items, total, discount = 0, buyerName, buyerHp, pelangganId, location, catatan, user }) {
  if (!items?.length) throw new Error("Pesanan kosong — tidak ada yang bisa di-keep.");
  const now = new Date();
  const payload = {
    date: localDateStr(now),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    location: location ?? null,
    buyer_name: buyerName?.trim() || null,
    buyer_hp: buyerHp?.trim() || null,
    pelanggan_id: pelangganId || null,
    items,
    discount: discount ?? 0,
    total: total ?? 0,
    catatan: catatan?.trim() || null,
    status: "aktif",
    created_by_email: user?.email ?? null,
    created_by_name: user?.name ?? null,
  };
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function setStatus(id, status, extra = {}) {
  if (!id) throw new Error("id keep wajib diisi.");
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const markKeepPaid = (id) => setStatus(id, "lunas", { paid_at: new Date().toISOString() });
export const cancelKeep = (id) => setStatus(id, "batal");
