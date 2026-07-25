/**
 * features/favorites/utils.js
 * Teks & share gabungan untuk banyak produk favorit sekaligus. Sama seperti
 * product-detail/utils.js, TIDAK menyertakan harga (apps/catalog dipakai
 * reseller B2B — harga publik bisa merugikan mereka).
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";

const CATALOG_BASE_URL = "https://catalog.deera.id";
// Batasi jumlah foto yang dilampirkan sekaligus supaya share sheet tidak
// berat/gagal di HP dengan koneksi lambat — sisanya tetap ada di teks
// (link ke halaman detail masing-masing).
const MAX_SHARE_PHOTOS = 6;

export function buildFavoritesShareText(products) {
  const lines = [`*DEERA Indonesia*`, ``, `Produk pilihan:`, ``];
  for (const p of products) {
    lines.push(`• *${p.kode}* — ${p.nama}`);
    lines.push(`  ${CATALOG_BASE_URL}/code/${p.kode}`);
  }
  return lines.join("\n");
}

/**
 * shareFavoritesViaWA(products)
 * Share banyak produk sekaligus (foto + satu teks gabungan) lewat Web
 * Share API — pola sama seperti shareProductViaWA di product-detail/utils.js,
 * bedanya di sini mengumpulkan foto dari BEBERAPA produk jadi satu share.
 */
export async function shareFavoritesViaWA(products) {
  const text = buildFavoritesShareText(products);
  const files = [];

  for (const p of products.slice(0, MAX_SHARE_PHOTOS)) {
    if (!p.image) continue;
    try {
      const imgUrl = cldUrl(p.image, { width: 1080 });
      const res = await fetch(imgUrl);
      if (res.ok) {
        const blob = await res.blob();
        const ext = blob.type.includes("webp") ? "webp" : "jpg";
        files.push(new File([blob], `${p.kode}.${ext}`, { type: blob.type }));
      }
    } catch {
      // satu foto gagal diunduh -> lanjut ke produk berikutnya, jangan
      // hentikan seluruh proses share
    }
  }

  if (navigator.share && files.length > 0 && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text });
      return { method: "share-file" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "aborted" };
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "aborted" };
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return { method: "wa-link" };
}
