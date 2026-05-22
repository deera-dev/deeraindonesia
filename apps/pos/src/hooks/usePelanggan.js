// Hook untuk manajemen pelanggan — offline-first
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { db } from "../lib/db";
import { syncPelanggan } from "../lib/sync";

// Ambil semua pelanggan dari cache lokal
export function usePelanggan() {
  const [pelanggan, setPelanggan] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    const local = await db.pelanggan.orderBy("nama").toArray();
    setPelanggan(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Juga sync dari Supabase jika online
    if (navigator.onLine) {
      syncPelanggan().then(() => load()).catch(() => {});
    }
  }, [load]);

  return { pelanggan, loading, reload: load };
}

// Cari pelanggan by nama (untuk autocomplete)
export async function searchPelanggan(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return db.pelanggan
    .filter(p => p.nama.toLowerCase().includes(q) || (p.no_hp ?? "").includes(q))
    .limit(8)
    .toArray();
}

// Tambah pelanggan baru
export async function addPelanggan({ nama, no_hp, alamat }) {
  const now = new Date().toISOString();
  const row = { nama: nama.trim(), no_hp: no_hp?.trim() || null, alamat: alamat?.trim() || null, created_at: now, updated_at: now };

  if (navigator.onLine) {
    const { data, error } = await supabase.from("pelanggan").insert(row).select().single();
    if (error) throw error;
    await db.pelanggan.put(data);
    return data;
  } else {
    // Simpan lokal dulu (tanpa id Supabase)
    const id = crypto.randomUUID();
    await db.pelanggan.put({ id, ...row });
    return { id, ...row };
  }
}

// Update pelanggan
export async function updatePelanggan(id, { nama, no_hp, alamat }) {
  const updated_at = new Date().toISOString();
  const changes    = { nama: nama.trim(), no_hp: no_hp?.trim() || null, alamat: alamat?.trim() || null, updated_at };

  if (navigator.onLine) {
    const { error } = await supabase.from("pelanggan").update(changes).eq("id", id);
    if (error) throw error;
  }
  await db.pelanggan.update(id, changes);
}

// Hapus pelanggan
export async function deletePelanggan(id) {
  if (navigator.onLine) {
    const { error } = await supabase.from("pelanggan").delete().eq("id", id);
    if (error) throw error;
  }
  await db.pelanggan.delete(id);
}
