/** features/foto-cantik/utils.js — pure helpers. */
import { cldUrl } from "@deera/shared/lib/cloudinary";

/** Kode produk unik dari item transaksi, urutan sesuai kemunculan. */
export function uniqueKodes(sale) {
  return [...new Set((sale?.items ?? []).map((i) => i.kode).filter(Boolean))];
}

/** Foto yang dipakai: foto utama > foto seri warna. null kalau tidak ada. */
export function pickPhotoUrl(product, width = 1080) {
  const src = product?.image || product?.seri_warna;
  return src ? cldUrl(src, { width }) : null;
}

/** Teks pengantar WhatsApp. */
export function buildShareText(sale, products) {
  const nama = sale?.buyer_name ? `Kak ${sale.buyer_name}` : "Kak";
  const list = products.map((p) => `• ${p.kode}${p.nama ? ` — ${p.nama}` : ""}`).join("\n");
  return `Halo ${nama}, terima kasih sudah belanja di Deera 🤍\nIni foto produk yang Kakak beli:\n${list}`;
}

/** Nama file dari kode + tipe blob. */
export function photoFileName(kode, blob) {
  const t = blob?.type ?? "";
  const ext = t.includes("webp") ? "webp" : t.includes("png") ? "png" : "jpg";
  return `${kode}.${ext}`;
}
