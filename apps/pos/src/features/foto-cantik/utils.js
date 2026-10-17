import { cldUrl } from "@deera/shared/lib/cloudinary";

export function uniqueKodes(sale) {
  return [...new Set((sale?.items ?? []).map((i) => i.kode).filter(Boolean))];
}

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

export function pickPhotoUrl(product, width = 1080) {
  const src = product?.image || product?.seri_warna;
  return src ? cldUrl(src, { width }) : null;
}

export function buildShareText(sale, products) {
  const nama = sale?.buyer_name ? `Kak ${sale.buyer_name}` : "Kak";
  const list = products.map((p) => `• ${p.kode}${p.size ? ` — ${p.size}` : ""}`).join("\n");
  return `Halo ${nama}, terima kasih sudah belanja di Deera 🤍\nIni foto produk yang Kakak beli:\n${list}`;
}

export function photoFileName(kode, blob) {
  const t = blob?.type ?? "";
  const ext = t.includes("webp") ? "webp" : t.includes("png") ? "png" : "jpg";
  return `${kode}.${ext}`;
}
