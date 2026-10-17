import imageCompression from "browser-image-compression";
import { uploadImage, uploadVideo } from "./cloudinary";

export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 100;

const QUALITY_STEPS = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45];
const LAST_RESORT_MAX_DIMENSION = 2500;

export function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

export function formatMB(bytes) {
  return `${bytesToMB(bytes).toFixed(2)} MB`;
}

export class MediaValidationError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = "MediaValidationError";
    this.meta = meta;
  }
}

export function validateMedia(file, kind = "image") {
  const sizeMB = bytesToMB(file.size);
  const limitMB = kind === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  return { ok: sizeMB <= limitMB, sizeMB, limitMB };
}

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
        maxWidthOrHeight: isLastStep ? LAST_RESORT_MAX_DIMENSION : undefined,
      });
      best = compressed;
      if (bytesToMB(compressed.size) <= MAX_IMAGE_MB) break;
    } catch (err) {
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

export function overSizeImageNotice() {
  return `Ukuran gambar melebihi batas ${MAX_IMAGE_MB} MB. Aplikasi akan mencoba mengompres gambar secara otomatis.`;
}

export function friendlyMediaErrorMessage(err) {
  if (err instanceof MediaValidationError) return err.message;
  return "Upload gagal. Periksa koneksi internet Anda dan coba lagi.";
}
