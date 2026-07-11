/**
 * features/produk/utils.js
 * Pure helpers + side-effectful share utility untuk fitur produk.
 */
import { generateWAText } from "@deera/shared/lib/waFormat";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import {
  MAX_IMAGE_MB,
  compressImageIfNeeded,
  overSizeImageNotice,
} from "@deera/shared/lib/mediaUpload";

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


/**
 * processImageFile(file, opt)
 * Helper dipakai ImageSection.jsx: validasi ukuran satu File image, dan
 * kompres otomatis kalau > MAX_IMAGE_MB. Mengembalikan objek siap-simpan
 * untuk state mainImage/detailImages ({ type:"file", file, preview,
 * status:"done", originalSizeMB, compressedSizeMB, compressed }), atau
 * null kalau gagal total (masih > limit setelah dikompres / error proses)
 * — pemanggil bertanggung jawab menampilkan pesan dari onError dan TIDAK
 * menyimpan file ini ke state.
 *
 * @param {File} file
 * @param {{ onNotice?: (msg: string) => void, onError?: (msg: string) => void }} opt
 */
export async function processImageFile(file, { onNotice, onError } = {}) {
  const preview = URL.createObjectURL(file);
  const originalSizeMB = file.size / (1024 * 1024);

  if (originalSizeMB <= MAX_IMAGE_MB) {
    return {
      type: "file",
      file,
      preview,
      status: "done",
      originalSizeMB,
      compressedSizeMB: originalSizeMB,
      compressed: false,
    };
  }

  onNotice?.(overSizeImageNotice());
  try {
    const result = await compressImageIfNeeded(file);
    if (result.stillTooBig) {
      onError?.(
        `Gambar masih melebihi batas maksimum ${MAX_IMAGE_MB} MB setelah dikompresi. Silakan gunakan gambar dengan ukuran yang lebih kecil.`,
      );
      return null;
    }
    return {
      type: "file",
      file: result.file,
      preview,
      status: "done",
      originalSizeMB: result.originalSizeMB,
      compressedSizeMB: result.compressedSizeMB,
      compressed: result.compressed,
    };
  } catch (err) {
    console.error("[processImageFile] gagal kompres gambar:", err);
    onError?.("Gagal memproses gambar. Coba gambar lain.");
    return null;
  }
}
