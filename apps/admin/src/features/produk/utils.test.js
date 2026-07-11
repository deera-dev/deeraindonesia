import { describe, it, expect, vi, beforeEach } from "vitest";

const compressImageIfNeededMock = vi.fn();
const overSizeImageNoticeMock = vi.fn(() => "Ukuran gambar melebihi batas 10 MB...");
vi.mock("@deera/shared/lib/mediaUpload", () => ({
  MAX_IMAGE_MB: 10,
  compressImageIfNeeded: (...args) => compressImageIfNeededMock(...args),
  overSizeImageNotice: (...args) => overSizeImageNoticeMock(...args),
}));

// shareProductViaWA tidak diuji di sini (tidak diubah oleh perubahan media upload) —
// vi.mock generateWAText/cldUrl dibutuhkan hanya karena utils.js meng-import-nya.
vi.mock("@deera/shared/lib/waFormat", () => ({ generateWAText: vi.fn(() => "text") }));
vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (url) => url }));

import { processImageFile } from "./utils";

function makeFile({ name = "foto.jpg", sizeMB = 3 } = {}) {
  const file = new File(["x"], name, { type: "image/jpeg" });
  Object.defineProperty(file, "size", { value: Math.round(sizeMB * 1024 * 1024) });
  return file;
}

const ORIGINAL_CREATE_OBJECT_URL = global.URL.createObjectURL;

beforeEach(() => {
  compressImageIfNeededMock.mockReset();
  overSizeImageNoticeMock.mockClear();
  global.URL.createObjectURL = vi.fn(() => "blob://preview");
});

describe("processImageFile", () => {
  it("file di bawah limit: langsung return done, tanpa panggil compressImageIfNeeded/onNotice", async () => {
    const file = makeFile({ sizeMB: 3 });
    const onNotice = vi.fn();
    const onError = vi.fn();

    const result = await processImageFile(file, { onNotice, onError });

    expect(compressImageIfNeededMock).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      type: "file",
      file,
      preview: "blob://preview",
      status: "done",
      originalSizeMB: 3,
      compressedSizeMB: 3,
      compressed: false,
    });
  });

  it("file di atas limit & kompresi berhasil: memanggil onNotice lalu return hasil kompresi", async () => {
    const file = makeFile({ sizeMB: 15 });
    const compressedFile = makeFile({ sizeMB: 6, name: "foto-compressed.jpg" });
    compressImageIfNeededMock.mockResolvedValue({
      file: compressedFile,
      originalSizeMB: 15,
      compressedSizeMB: 6,
      compressed: true,
      stillTooBig: false,
    });
    const onNotice = vi.fn();

    const result = await processImageFile(file, { onNotice });

    expect(onNotice).toHaveBeenCalledWith(overSizeImageNoticeMock());
    expect(result).toMatchObject({
      type: "file",
      file: compressedFile,
      status: "done",
      originalSizeMB: 15,
      compressedSizeMB: 6,
      compressed: true,
    });
  });

  it("file di atas limit & masih terlalu besar setelah kompresi: return null, memanggil onError dengan pesan yang sesuai", async () => {
    const file = makeFile({ sizeMB: 40 });
    compressImageIfNeededMock.mockResolvedValue({
      file,
      originalSizeMB: 40,
      compressedSizeMB: 12,
      compressed: true,
      stillTooBig: true,
    });
    const onError = vi.fn();

    const result = await processImageFile(file, { onError });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("masih melebihi batas maksimum"),
    );
  });

  it("compressImageIfNeeded throw: return null, memanggil onError dengan pesan generik", async () => {
    const file = makeFile({ sizeMB: 20 });
    compressImageIfNeededMock.mockRejectedValue(new Error("worker crash"));
    const onError = vi.fn();

    const result = await processImageFile(file, { onError });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith("Gagal memproses gambar. Coba gambar lain.");
  });
});
