/**
 * mediaUpload.js — Validasi & kompresi media sebelum upload ke Cloudinary.
 *
 * Latar belakang: Cloudinary Free Plan membatasi ukuran upload
 * (image maksimal 10 MB, video maksimal 100 MB). Tanpa validasi di sisi
 * client, user mendapat error 400 mentah dari Cloudinary. Modul ini adalah
 * SATU-SATUNYA titik masuk untuk upload media di seluruh aplikasi — semua
 * fitur (produk, produksi-bahan, produksi-sampel, dst) wajib memakai
 * `uploadMedia()` (atau `validateMedia()`/`compressImageIfNeeded()` secara
 * terpisah kalau butuh kontrol lebih halus di UI) alih-alih memanggil
 * `uploadImage`/`uploadVideo` dari cloudinary.js secara langsung.
 *
 * Bagian yang dipecah (§ Reusability di spec):
 *   validateMedia(file, kind)        — cek ukuran, tidak melakukan side-effect
 *   compressImageIfNeeded(file, opt) — kompresi bertahap KHUSUS image
 *   uploadMedia(file, opt)           — orkestrasi: validasi + kompresi + upload
 *
 * Video TIDAK dikompres (sengaja, sesuai spec) — kompresi video di browser
 * berat & lambat, terutama di perangkat mobile. Video yang melebihi limit
 * langsung ditolak dengan pesan yang jelas, tidak pernah dikirim ke Cloudinary.
 */
import imageCompression from "browser-image-compression";
import { uploadImage, uploadVideo } from "./cloudinary";

// ============= KONSTANTA =============
// Batas Cloudinary Free Plan.
export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 100;

// Tangga kualitas kompresi: mulai tinggi (±95%), turun bertahap HANYA kalau
// masih di atas limit. Resize resolusi (maxWidthOrHeight) baru diaktifkan
// di langkah TERAKHIR, sebagai upaya paling akhir — sesuai spec "hindari
// resize kecuali benar-benar diperlukan".
const QUALITY_STEPS = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45];
const LAST_RESORT_MAX_DIMENSION = 2500; // px, hanya dipakai di langkah terakhir

// ============= HELPERS =============
export function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

export function formatMB(bytes) {
  return `${bytesToMB(bytes).toFixed(2)} MB`;
}

/**
 * Error yang sudah membawa pesan ramah (Bahasa Indonesia) siap ditampilkan
 * ke user apa adanya — bukan pesan teknis dari Cloudinary/browser.
 */
export class MediaValidationError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = "MediaValidationError";
    this.meta = meta;
  }
}

// ============= VALIDATE =============
/**
 * Cek ukuran file terhadap limit Cloudinary Free Plan. Tidak melakukan
 * side-effect apa pun (tidak upload, tidak kompres) — murni pengecekan,
 * supaya UI bisa menampilkan ukuran file & keputusan (perlu kompresi atau
 * tidak) SEBELUM proses lain mulai.
 *
 * @param {File} file
 * @param {"image"|"video"} kind
 * @returns {{ ok: boolean, sizeMB: number, limitMB: number }}
 */
export function validateMedia(file, kind = "image") {
  const sizeMB = bytesToMB(file.size);
  const limitMB = kind === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  return { ok: sizeMB <= limitMB, sizeMB, limitMB };
}

// ============= COMPRESS (image saja) =============
/**
 * Kompresi image secara bertahap kalau melebihi MAX_IMAGE_MB. Aspect ratio
 * & orientasi EXIF dipertahankan (preserveExif: true, tidak ada crop/rotate
 * manual). Kalau file sudah di bawah limit, dikembalikan apa adanya tanpa
 * proses kompresi (no-op murah).
 *
 * @param {File} file
 * @param {{ onStatus?: (status: "compressing", meta: object) => void }} opt
 * @returns {Promise<{
 *   file: File,
 *   originalSizeMB: number,
 *   compressedSizeMB: number,
 *   compressed: boolean,
 *   stillTooBig: boolean,
 * }>}
 */
export async function compressImageIfNeeded(file, { onStatus } = {}) {
  const originalSizeMB = bytesToMB(file.size);

  if (originalSizeMB <= MAX_IMAGE_MB) {
    return {
      file,
      originalSizeMB,
      compressedSizeMB: originalSizeMB,
      compressed: false,
      stillTooBig: false,
    };
  }

  onStatus?.("compressing", { originalSizeMB });

  let best = file;
  for (let i = 0; i < QUALITY_STEPS.length; i++) {
    const quality = QUALITY_STEPS[i];
    const isLastStep = i === QUALITY_STEPS.length - 1;
    try {
      // eslint-disable-next-line no-await-in-loop -- kompresi bertahap harus sekuensial
      const compressed = await imageCompression(file, {
        maxSizeMB: MAX_IMAGE_MB,
        initialQuality: quality,
        useWebWorker: true,
        preserveExif: true,
        // Resize resolusi HANYA sebagai langkah terakhir, bukan default.
        maxWidthOrHeight: isLastStep ? LAST_RESORT_MAX_DIMENSION : undefined,
      });
      best = compressed;
      if (bytesToMB(compressed.size) <= MAX_IMAGE_MB) break;
    } catch (err) {
      // Satu langkah kualitas gagal (mis. format tidak didukung worker) —
      // lanjut ke langkah berikutnya, jangan hentikan seluruh proses.
      console.error("[compressImageIfNeeded] gagal pada quality", quality, err);
    }
  }

  const compressedSizeMB = bytesToMB(best.size);
  return {
    file: best,
    originalSizeMB,
    compressedSizeMB,
    compressed: true,
    stillTooBig: compressedSizeMB > MAX_IMAGE_MB,
  };
}

// ============= UPLOAD (satu pintu: validasi + kompresi + upload) =============
/**
 * Titik masuk utama untuk upload media di seluruh aplikasi. Melakukan:
 *   1. Validasi ukuran.
 *   2. Kalau image & melebihi limit → kompresi bertahap otomatis.
 *   3. Kalau video & melebihi limit → tolak, TIDAK pernah dikirim ke Cloudinary.
 *   4. Upload file (hasil kompresi kalau ada) ke Cloudinary via cloudinary.js.
 *
 * @param {File} file
 * @param {{
 *   kind?: "image"|"video",
 *   onProgress?: (pct: number) => void,
 *   onStatus?: (status: "ready"|"compressing"|"uploading"|"success"|"failed", meta: object) => void,
 * }} opt
 * @returns {Promise<{ url: string, originalSizeMB: number, compressedSizeMB: number, compressed: boolean }>}
 */
export async function uploadMedia(file, { kind = "image", onProgress, onStatus } = {}) {
  const validation = validateMedia(file, kind);
  onStatus?.("ready", { sizeMB: validation.sizeMB });

  if (kind === "video") {
    if (!validation.ok) {
      onStatus?.("failed", { sizeMB: validation.sizeMB });
      throw new MediaValidationError(
        `Ukuran video melebihi batas maksimum ${MAX_VIDEO_MB} MB untuk paket Cloudinary Free.`,
        { sizeMB: validation.sizeMB },
      );
    }
    onStatus?.("uploading", { sizeMB: validation.sizeMB });
    try {
      const result = await uploadVideo(file, { onProgress });
      onStatus?.("success", { sizeMB: validation.sizeMB });
      return {
        ...result,
        originalSizeMB: validation.sizeMB,
        compressedSizeMB: validation.sizeMB,
        compressed: false,
      };
    } catch (err) {
      onStatus?.("failed", { sizeMB: validation.sizeMB });
      throw err;
    }
  }

  // ── Image ──
  let fileToUpload = file;
  let originalSizeMB = validation.sizeMB;
  let compressedSizeMB = validation.sizeMB;
  let wasCompressed = false;

  if (!validation.ok) {
    const compressResult = await compressImageIfNeeded(file, { onStatus });
    fileToUpload = compressResult.file;
    originalSizeMB = compressResult.originalSizeMB;
    compressedSizeMB = compressResult.compressedSizeMB;
    wasCompressed = compressResult.compressed;

    if (compressResult.stillTooBig) {
      onStatus?.("failed", { originalSizeMB, compressedSizeMB });
      throw new MediaValidationError(
        `Gambar masih melebihi batas maksimum ${MAX_IMAGE_MB} MB setelah dikompresi. Silakan gunakan gambar dengan ukuran yang lebih kecil.`,
        { originalSizeMB, compressedSizeMB },
      );
    }
  }

  onStatus?.("uploading", { originalSizeMB, compressedSizeMB });
  try {
    const result = await uploadImage(fileToUpload, { onProgress });
    onStatus?.("success", { originalSizeMB, compressedSizeMB });
    return { ...result, originalSizeMB, compressedSizeMB, compressed: wasCompressed };
  } catch (err) {
    onStatus?.("failed", { originalSizeMB, compressedSizeMB });
    throw err;
  }
}

// ============= PESAN RAMAH =============
/**
 * Pesan awal yang ditampilkan begitu user memilih image > 10 MB, SEBELUM
 * kompresi mulai — dipisah dari MediaValidationError karena ini bukan error,
 * hanya info ("kami akan coba kompres otomatis").
 */
export function overSizeImageNotice() {
  return `Ukuran gambar melebihi batas ${MAX_IMAGE_MB} MB. Aplikasi akan mencoba mengompres gambar secara otomatis.`;
}

/**
 * Ekstrak pesan yang aman ditampilkan ke user dari error apa pun yang
 * dilempar uploadMedia()/compressImageIfNeeded(). Untuk MediaValidationError,
 * pesan sudah ramah dan bisa ditampilkan apa adanya. Untuk error lain
 * (network, Cloudinary down, dll), kembalikan pesan generik supaya detail
 * teknis mentah tidak bocor ke user.
 */
export function friendlyMediaErrorMessage(err) {
  if (err instanceof MediaValidationError) return err.message;
  return "Upload gagal. Periksa koneksi internet Anda dan coba lagi.";
}
