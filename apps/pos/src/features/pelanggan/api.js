import { supabase } from "@deera/shared/lib/supabase";
import { db } from "../../lib/db";
import { logActivity } from "../riwayat/api";

export async function fetchSalesByPelanggan(pelangganId) {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, date, created_at, type, location, items, discount, total, buyer_name, buyer_hp, created_by_name, stok_adjustments",
    )
    .eq("pelanggan_id", pelangganId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSalesByBuyerName(buyerName) {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, date, created_at, type, location, items, discount, total, buyer_name, buyer_hp, created_by_name, stok_adjustments",
    )
    .ilike("buyer_name", buyerName)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addPelanggan({ nama, no_hp, alamat }) {
  const now = new Date().toISOString();
  const row = {
    nama: nama.trim(),
    no_hp: no_hp?.trim() || null,
    alamat: alamat?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  let result;
  if (navigator.onLine) {
    const { data, error } = await supabase.from("pelanggan").insert(row).select().single();
    if (error) throw error;
    await db.pelanggan.put(data);
    result = data;
  } else {
    const id = crypto.randomUUID();
    await db.pelanggan.put({ id, ...row });
    result = { id, ...row };
  }

  await logActivity({
    action: "pelanggan-tambah",
    category: "pelanggan",
    kode: result.id,
    nama: result.nama,
    snapshot: result,
  });
  return result;
}

export async function updatePelanggan(id, { nama, no_hp, alamat }) {
  const updated_at = new Date().toISOString();
  const before = await db.pelanggan.get(id);
  const changes = {
    nama: nama.trim(),
    no_hp: no_hp?.trim() || null,
    alamat: alamat?.trim() || null,
    updated_at,
  };

  if (navigator.onLine) {
    const { error } = await supabase.from("pelanggan").update(changes).eq("id", id);
    if (error) throw error;
  }
  await db.pelanggan.update(id, changes);

  await logActivity({
    action: "pelanggan-edit",
    category: "pelanggan",
    kode: id,
    nama: changes.nama,
    snapshot: { id, ...changes },
    before,
  });
}

export async function deletePelanggan(id) {
  const before = await db.pelanggan.get(id);

  if (navigator.onLine) {
    const { error } = await supabase.from("pelanggan").delete().eq("id", id);
    if (error) throw error;
  }
  await db.pelanggan.delete(id);

  await logActivity({
    action: "pelanggan-hapus",
    category: "pelanggan",
    kode: id,
    nama: before?.nama ?? "",
    before,
  });
}
