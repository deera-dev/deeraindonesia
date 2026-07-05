/**
 * features/produk/utils.js
 * Pure helpers + side-effectful share utility untuk fitur produk.
 */
import { generateWAText } from "@deera/shared/lib/waFormat";
import { cldUrl } from "@deera/shared/lib/cloudinary";

/**
 * shareProductViaWA(product)
 * Berbagi produk ke WhatsApp.
 *
 * Urutan:
 * 1. Kumpulkan file: coba video dulu, lalu foto jika ada
 * 2. navigator.share({ files, text }) — mobile, file(s) attached
 * 3. navigator.share({ text }) — fallback teks saja
 * 4. window.open wa.me — fallback desktop
 *
 * @returns {{ method: string }} method yang berhasil dipakai
 */
export async function shareProductViaWA(product) {
  const text = generateWAText(product);
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
