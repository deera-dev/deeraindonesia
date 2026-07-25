/**
 * features/product-detail/utils.js
 * Pure helper + side-effectful share utility untuk fitur detail produk.
 *
 * CATATAN PENTING: apps/catalog dipakai reseller (B2B). Teks share di sini
 * SENGAJA TIDAK menyertakan harga (berbeda dari generateWAText di
 * @deera/shared/lib/waFormat yang dipakai apps/admin) — kalau harga bocor ke
 * end user lewat forward pesan, reseller kita kesulitan menjual barangnya.
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";
// Reuse urutan katalog (filter punya foto + sort created_at desc) dari
// product-catalog/utils.js supaya navigasi sebelumnya/selanjutnya di
// halaman detail konsisten dengan urutan scroll di katalog. Import
// utils.js lintas-fitur di layer yang sama ini analog dengan pola
// "api.js boleh import api.js fitur lain" di CLAUDE.md §4/§7.
import { sortCatalogProducts } from "../product-catalog/utils";

const CATALOG_BASE_URL = "https://catalog.deera.id";

/**
 * buildShareText(product)
 * Teks caption untuk share produk — kode, nama, bahan, dan link ke halaman
 * detail publik (foto + video lengkap). Tidak ada harga.
 */
export function buildShareText(product) {
  const lines = [`*DEERA Indonesia*`, ``, `*${product.kode}*`, `*${product.nama}*`];

  if (product.bahan) {
    lines.push(``, `Bahan: ${product.bahan}`);
  }

  lines.push(``, `Lihat foto & video lengkap:`, `${CATALOG_BASE_URL}/code/${product.kode}`);

  return lines.join("\n");
}

/**
 * shareProductViaWA(product)
 * Share produk (foto/video + teks) via Web Share API supaya reseller bisa
 * meneruskan produk ke kontak/pelanggan mereka sendiri — pola sama persis
 * dengan shareProductViaWA di apps/admin/src/features/produk/utils.js,
 * hanya beda sumber teks (buildShareText, tanpa harga).
 *
 * Urutan:
 * 1. Kumpulkan file: coba video dulu, lalu foto jika ada
 * 2. navigator.share({ files, text }) — mobile, file(s) terlampir
 * 3. navigator.share({ text }) — fallback teks saja
 * 4. window.open wa.me — fallback desktop
 *
 * @returns {{ method: string }} method yang berhasil dipakai
 */
export async function shareProductViaWA(product) {
  const text = buildShareText(product);
  const files = [];

  // 1. Coba video dulu
  if (product.video) {
    try {
      const res = await fetch(product.video);
      if (res.ok) {
        const blob = await res.blob();
        const ext = blob.type.includes("mp4")
          ? "mp4"
          : blob.type.includes("quicktime") ? "mov" : "mp4";
        files.push(new File([blob], `${product.kode}.${ext}`, { type: blob.type }));
      }
    } catch {
      // video gagal diunduh, lanjut
    }
  }

  // 2. Kalau tidak ada video (atau gagal), lampirkan foto
  if (files.length === 0 && product.image) {
    try {
      const imgUrl = cldUrl(product.image, { width: 1080 });
      const res = await fetch(imgUrl);
      if (res.ok) {
        const blob = await res.blob();
        const ext = blob.type.includes("webp") ? "webp" : "jpg";
        files.push(new File([blob], `${product.kode}.${ext}`, { type: blob.type }));
      }
    } catch {
      // foto gagal, lanjut ke text-only share
    }
  }

  // 3. Share dengan file jika tersedia
  if (navigator.share && files.length > 0 && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text });
      return { method: "share-file" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "aborted" };
      // canShare berhasil tapi share gagal — coba text-only
    }
  }

  // 4. Fallback: share teks saja
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "aborted" };
    }
  }

  // 5. Fallback desktop: buka wa.me
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return { method: "wa-link" };
}


/**
 * getAdjacentKodes(products, kode)
 * Hitung kode produk sebelumnya/selanjutnya berdasarkan urutan katalog
 * resmi (sortCatalogProducts), plus posisi & total — dipakai untuk tombol
 * navigasi sebelumnya/selanjutnya di ProductDetailPage.
 */
export function getAdjacentKodes(products, kode) {
  const sorted = sortCatalogProducts(products);
  const index = sorted.findIndex((p) => p.kode === kode);
  if (index === -1) {
    return { prevKode: null, nextKode: null, position: 0, total: sorted.length };
  }
  return {
    prevKode: index > 0 ? sorted[index - 1].kode : null,
    nextKode: index < sorted.length - 1 ? sorted[index + 1].kode : null,
    position: index + 1,
    total: sorted.length,
  };
}
