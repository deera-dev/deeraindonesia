import { describe, it, expect, vi, beforeEach } from "vitest";

const imageCompressionMock = vi.fn();
vi.mock("browser-image-compression", () => ({
  default: (...args) => imageCompressionMock(...args),
}));

const uploadImageMock = vi.fn();
const uploadVideoMock = vi.fn();
vi.mock("./cloudinary", () => ({
  uploadImage: (...args) => uploadImageMock(...args),
  uploadVideo: (...args) => uploadVideoMock(...args),
}));

import {
  MAX_IMAGE_MB,
  MAX_VIDEO_MB,
  bytesToMB,
  formatMB,
  validateMedia,
  compressImageIfNeeded,
  uploadMedia,
  overSizeImageNotice,
  friendlyMediaErrorMessage,
  MediaValidationError,
} from "./mediaUpload";

function makeFile({ name = "file.jpg", type = "image/jpeg", sizeMB } = {}) {
  const file = new File(["x"], name, { type });
  if (sizeMB != null) {
    Object.defineProperty(file, "size", { value: Math.round(sizeMB * 1024 * 1024) });
  }
  return file;
}

beforeEach(() => {
  imageCompressionMock.mockReset();
  uploadImageMock.mockReset();
  uploadVideoMock.mockReset();
});

describe("bytesToMB / formatMB", () => {
  it("mengonversi bytes ke MB", () => {
    expect(bytesToMB(1024 * 1024)).toBe(1);
    expect(bytesToMB(5 * 1024 * 1024)).toBe(5);
  });

  it("formatMB menampilkan 2 desimal + unit MB", () => {
    expect(formatMB(1024 * 1024)).toBe("1.00 MB");
  });
});

describe("validateMedia", () => {
  it("image tepat di batas 10 MB -> ok", () => {
    const file = makeFile({ sizeMB: MAX_IMAGE_MB });
    const result = validateMedia(file, "image");
    expect(result.ok).toBe(true);
    expect(result.limitMB).toBe(MAX_IMAGE_MB);
  });

  it("image sedikit di atas 10 MB -> tidak ok", () => {
    const file = makeFile({ sizeMB: MAX_IMAGE_MB + 0.01 });
    expect(validateMedia(file, "image").ok).toBe(false);
  });

  it("video tepat di batas 100 MB -> ok", () => {
    const file = makeFile({ sizeMB: MAX_VIDEO_MB, type: "video/mp4" });
    const result = validateMedia(file, "video");
    expect(result.ok).toBe(true);
    expect(result.limitMB).toBe(MAX_VIDEO_MB);
  });

  it("video di atas 100 MB -> tidak ok", () => {
    const file = makeFile({ sizeMB: MAX_VIDEO_MB + 1, type: "video/mp4" });
    expect(validateMedia(file, "video").ok).toBe(false);
  });

  it("default kind = image saat tidak diberikan", () => {
    const file = makeFile({ sizeMB: MAX_IMAGE_MB + 5 });
    expect(validateMedia(file).ok).toBe(false);
    expect(validateMedia(file).limitMB).toBe(MAX_IMAGE_MB);
  });
});

describe("compressImageIfNeeded", () => {
  it("no-op saat file sudah di bawah limit — tidak memanggil imageCompression", async () => {
    const file = makeFile({ sizeMB: 5 });
    const result = await compressImageIfNeeded(file);
    expect(imageCompressionMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      file,
      originalSizeMB: 5,
      compressedSizeMB: 5,
      compressed: false,
      stillTooBig: false,
    });
  });

  it("kompresi berhasil di percobaan pertama — berhenti begitu di bawah limit", async () => {
    const original = makeFile({ sizeMB: 15 });
    const compressed = makeFile({ sizeMB: 6 });
    imageCompressionMock.mockResolvedValueOnce(compressed);

    const onStatus = vi.fn();
    const result = await compressImageIfNeeded(original, { onStatus });

    expect(imageCompressionMock).toHaveBeenCalledTimes(1);
    expect(imageCompressionMock).toHaveBeenCalledWith(
      original,
      expect.objectContaining({
        maxSizeMB: MAX_IMAGE_MB,
        initialQuality: 0.95,
        preserveExif: true,
      }),
    );
    expect(result.compressed).toBe(true);
    expect(result.stillTooBig).toBe(false);
    expect(result.compressedSizeMB).toBe(6);
    expect(onStatus).toHaveBeenCalledWith("compressing", { originalSizeMB: 15 });
  });

  it("terus turunkan kualitas sampai di bawah limit (percobaan ke-2)", async () => {
    const original = makeFile({ sizeMB: 20 });
    const stillBig = makeFile({ sizeMB: 12 });
    const small = makeFile({ sizeMB: 8 });
    imageCompressionMock.mockResolvedValueOnce(stillBig).mockResolvedValueOnce(small);

    const result = await compressImageIfNeeded(original);

    expect(imageCompressionMock).toHaveBeenCalledTimes(2);
    expect(result.compressedSizeMB).toBe(8);
    expect(result.stillTooBig).toBe(false);
  });

  it("stillTooBig = true saat semua langkah kualitas gagal menurunkan cukup", async () => {
    const original = makeFile({ sizeMB: 50 });
    // Semua percobaan tetap mengembalikan file besar
    imageCompressionMock.mockResolvedValue(makeFile({ sizeMB: 15 }));

    const result = await compressImageIfNeeded(original);

    expect(result.stillTooBig).toBe(true);
    expect(result.compressed).toBe(true);
  });

  it("melanjutkan ke langkah berikutnya kalau satu langkah kompresi throw", async () => {
    const original = makeFile({ sizeMB: 15 });
    const ok = makeFile({ sizeMB: 7 });
    imageCompressionMock
      .mockRejectedValueOnce(new Error("worker gagal"))
      .mockResolvedValueOnce(ok);

    const result = await compressImageIfNeeded(original);

    expect(imageCompressionMock).toHaveBeenCalledTimes(2);
    expect(result.compressedSizeMB).toBe(7);
    expect(result.stillTooBig).toBe(false);
  });

  it("langkah terakhir menambahkan maxWidthOrHeight (resize sebagai upaya akhir)", async () => {
    const original = makeFile({ sizeMB: 50 });
    imageCompressionMock.mockResolvedValue(makeFile({ sizeMB: 15 }));

    await compressImageIfNeeded(original);

    const lastCallOpts = imageCompressionMock.mock.calls.at(-1)[1];
    expect(lastCallOpts.maxWidthOrHeight).toBeDefined();
    // Langkah-langkah sebelum yang terakhir TIDAK menyertakan maxWidthOrHeight
    const firstCallOpts = imageCompressionMock.mock.calls[0][1];
    expect(firstCallOpts.maxWidthOrHeight).toBeUndefined();
  });
});

describe("uploadMedia — video", () => {
  it("upload video yang valid, memanggil uploadVideo & onStatus ready->uploading->success", async () => {
    const file = makeFile({ sizeMB: 20, type: "video/mp4" });
    uploadVideoMock.mockResolvedValue({ url: "https://cld/vid.mp4" });
    const onStatus = vi.fn();
    const onProgress = vi.fn();

    const result = await uploadMedia(file, { kind: "video", onStatus, onProgress });

    expect(uploadVideoMock).toHaveBeenCalledWith(file, { onProgress });
    expect(result).toMatchObject({
      url: "https://cld/vid.mp4",
      originalSizeMB: 20,
      compressedSizeMB: 20,
      compressed: false,
    });
    expect(onStatus.mock.calls.map((c) => c[0])).toEqual(["ready", "uploading", "success"]);
  });

  it("video > 100MB ditolak sebelum upload, melempar MediaValidationError", async () => {
    const file = makeFile({ sizeMB: 120, type: "video/mp4" });
    const onStatus = vi.fn();

    await expect(uploadMedia(file, { kind: "video", onStatus })).rejects.toThrow(
      MediaValidationError,
    );
    await expect(uploadMedia(file, { kind: "video", onStatus })).rejects.toThrow(
      `Ukuran video melebihi batas maksimum ${MAX_VIDEO_MB} MB untuk paket Cloudinary Free.`,
    );
    expect(uploadVideoMock).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith("failed", expect.any(Object));
  });

  it("melempar ulang & set status failed saat uploadVideo gagal", async () => {
    const file = makeFile({ sizeMB: 10, type: "video/mp4" });
    uploadVideoMock.mockRejectedValue(new Error("network down"));
    const onStatus = vi.fn();

    await expect(uploadMedia(file, { kind: "video", onStatus })).rejects.toThrow("network down");
    expect(onStatus).toHaveBeenCalledWith("failed", expect.any(Object));
  });
});

describe("uploadMedia — image", () => {
  it("image di bawah limit: upload langsung tanpa kompresi", async () => {
    const file = makeFile({ sizeMB: 3 });
    uploadImageMock.mockResolvedValue({ url: "https://cld/img.jpg" });

    const result = await uploadMedia(file, { kind: "image" });

    expect(imageCompressionMock).not.toHaveBeenCalled();
    expect(uploadImageMock).toHaveBeenCalledWith(file, { onProgress: undefined });
    expect(result).toMatchObject({
      url: "https://cld/img.jpg",
      originalSizeMB: 3,
      compressedSizeMB: 3,
      compressed: false,
    });
  });

  it("image di atas limit: kompresi dulu baru upload hasil kompresi", async () => {
    const original = makeFile({ sizeMB: 15 });
    const compressed = makeFile({ sizeMB: 6 });
    imageCompressionMock.mockResolvedValueOnce(compressed);
    uploadImageMock.mockResolvedValue({ url: "https://cld/img-compressed.jpg" });

    const result = await uploadMedia(original, { kind: "image" });

    expect(uploadImageMock).toHaveBeenCalledWith(compressed, { onProgress: undefined });
    expect(result.compressed).toBe(true);
    expect(result.originalSizeMB).toBe(15);
    expect(result.compressedSizeMB).toBe(6);
  });

  it("image masih > limit setelah kompresi: melempar MediaValidationError, tidak upload", async () => {
    const original = makeFile({ sizeMB: 50 });
    imageCompressionMock.mockResolvedValue(makeFile({ sizeMB: 15 }));

    await expect(uploadMedia(original, { kind: "image" })).rejects.toThrow(MediaValidationError);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("melempar ulang & set status failed saat uploadImage gagal", async () => {
    const file = makeFile({ sizeMB: 3 });
    uploadImageMock.mockRejectedValue(new Error("cloudinary down"));
    const onStatus = vi.fn();

    await expect(uploadMedia(file, { kind: "image", onStatus })).rejects.toThrow(
      "cloudinary down",
    );
    expect(onStatus).toHaveBeenCalledWith("failed", expect.any(Object));
  });
});

describe("overSizeImageNotice / friendlyMediaErrorMessage", () => {
  it("overSizeImageNotice menyebutkan batas MAX_IMAGE_MB", () => {
    expect(overSizeImageNotice()).toContain(String(MAX_IMAGE_MB));
    expect(overSizeImageNotice()).toContain("mengompres");
  });

  it("friendlyMediaErrorMessage mengembalikan message MediaValidationError apa adanya", () => {
    const err = new MediaValidationError("Pesan ramah khusus");
    expect(friendlyMediaErrorMessage(err)).toBe("Pesan ramah khusus");
  });

  it("friendlyMediaErrorMessage mengembalikan pesan generik untuk error lain", () => {
    expect(friendlyMediaErrorMessage(new Error("stack trace teknis"))).toBe(
      "Upload gagal. Periksa koneksi internet Anda dan coba lagi.",
    );
  });
});
