/** features/foto-cantik/utils.js — pure helpers. */
import { cldUrl } from "@deera/shared/lib/cloudinary";

/** Kode produk unik dari item transaksi, urutan sesuai kemunculan. */
export function uniqueKodes(sale) {
  return [...new Set((sale?.items ?? []).map((i) => i.kode).filter(Boolean))];
}

/** kode → ukuran yang dibeli, mis. { "D-1": "MIDI" } atau "MIDI, GAMIS" bila beda ukuran. */
export function sizesByKode(sale) {
  const out = {};
  for (const i of sale?.items ?? []) {
    if (!i.kode || !i.size) continue;
    const sz = String(i.size).toUpperCase();
    const list = out[i.kode] ?? [];
    if (!list.includes(sz)) list.push(sz);
    out[i.kode] = list;
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join(", ")]));
}

/** Foto yang dipakai: foto utama > foto seri warna. null kalau tidak ada. */
export function pickPhotoUrl(product, width = 1080) {
  const src = product?.image || product?.seri_warna;
  return src ? cldUrl(src, { width }) : null;
}

/** Teks pengantar WhatsApp. */
export function buildShareText(sale, products) {
  const nama = sale?.buyer_name ? `Kak ${sale.buyer_name}` : "Kak";
  const list = products.map((p) => `• ${p.kode}${p.size ? ` — ${p.size}` : ""}`).join("\n");
  return `Halo ${nama}, terima kasih sudah belanja di Deera 🤍\nIni foto produk yang Kakak beli:\n${list}`;
}

/** Nama file dari kode + tipe blob. */
export function photoFileName(kode, blob) {
  const t = blob?.type ?? "";
  const ext = t.includes("webp") ? "webp" : t.includes("png") ? "png" : "jpg";
  return `${kode}.${ext}`;
}
