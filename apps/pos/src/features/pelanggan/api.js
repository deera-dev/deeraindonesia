/**
 * features/pelanggan/api.js — Raw I/O (Supabase + cache Dexie) untuk CRUD
 * pelanggan. Tidak ada React di sini. Offline-first: tulis ke Supabase dulu
 * kalau online, baru update cache Dexie lokal; tiap mutasi tercatat ke log
 * audit bersama lewat `logActivity` (cross-feature, same-layer import dari
 * ../riwayat/api — pola yang sama dengan apps/admin/features/produksi-sampel
 * yang mengimpor ../history/api).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { db } from "../../lib/db";
import { logActivity } from "../riwayat/api";

// Tambah pelanggan baru
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

// Update pelanggan
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

// Hapus pelanggan
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
