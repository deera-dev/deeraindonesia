/**
 * features/foto-cantik/api.js — Raw I/O: ambil foto produk (Supabase) untuk
 * dibagikan ke pembeli lewat WhatsApp. Tidak ada React di sini.
 */
import { supabase } from "@deera/shared/lib/supabase";

/** Ambil kode, nama, image, seri_warna produk untuk daftar kode. */
export async function fetchProductPhotos(kodes) {
  if (!kodes?.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select("kode, nama, image, seri_warna")
    .in("kode", kodes);
  if (error) throw error;
  return data ?? [];
}

/** Unduh satu gambar sebagai Blob (null kalau gagal/timeout). */
export async function fetchImageBlob(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
