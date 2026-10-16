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

/**
 * Cap kode (+ nama) di bawah foto, seperti kartu share di Admin. Kalau canvas/
 * createImageBitmap tidak tersedia atau gagal, kembalikan blob asli.
 */
export async function stampKodeOnImage(blob, { kode, nama }) {
  try {
    const bmp = await createImageBitmap(blob);
    const w = bmp.width;
    const h = bmp.height;
    const band = Math.round(w * 0.16);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h + band;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    ctx.fillStyle = "#0f0b07";
    ctx.fillRect(0, h, w, band);
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#CAB170";
    ctx.font = `bold ${Math.round(band * 0.38)}px serif`;
    ctx.fillText(kode, Math.round(w * 0.05), h + band * 0.35);
    if (nama) {
      ctx.fillStyle = "#c0b090";
      ctx.font = `${Math.round(band * 0.24)}px serif`;
      ctx.fillText(nama, Math.round(w * 0.05), h + band * 0.74, w * 0.9);
    }
    const out = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    return out ?? blob;
  } catch {
    return blob;
  }
}
