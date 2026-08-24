import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const compressImageIfNeededMock = vi.fn();
const overSizeImageNoticeMock = vi.fn(() => "Ukuran gambar melebihi batas 10 MB...");
vi.mock("@deera/shared/lib/mediaUpload", () => ({
  MAX_IMAGE_MB: 10,
  compressImageIfNeeded: (...args) => compressImageIfNeededMock(...args),
  overSizeImageNotice: (...args) => overSizeImageNoticeMock(...args),
}));

vi.mock("@deera/shared/lib/waFormat", () => ({
  generateWAText: vi.fn(() => "text"),
  generateWABulkText: vi.fn(() => "bulk text"),
}));
vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (url) => url }));

import {
  processImageFile,
  shareProductViaWA,
  shareProductsViaWA,
  filterAndSortProducts,
} from "./utils";

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


describe("shareProductViaWA", () => {
  const product = {
    kode: "D-07-OSK",
    nama: "Gamis Dewi",
    image: "gamis-dewi.jpg",
    video: null,
    seri_warna: null,
  };

  let originalShare;
  let originalCanShare;
  let originalFetch;
  let originalOpen;

  beforeEach(() => {
    originalShare = navigator.share;
    originalCanShare = navigator.canShare;
    originalFetch = global.fetch;
    originalOpen = window.open;
    window.open = vi.fn();
  });

  afterEach(() => {
    navigator.share = originalShare;
    navigator.canShare = originalCanShare;
    global.fetch = originalFetch;
    window.open = originalOpen;
    vi.restoreAllMocks();
  });

  it("prioritas 1: memakai foto seri_warna kalau ada (mengalahkan image & video)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductViaWA({
      ...product,
      seri_warna: "seri-warna.jpg",
      image: "main.jpg",
      video: "https://example.com/v.mp4",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "seri-warna.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ method: "share-file" });
  });

  it("prioritas 2: fallback ke foto utama kalau seri_warna tidak ada", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductViaWA({ ...product, seri_warna: null, image: "main.jpg", video: "https://example.com/v.mp4" });

    expect(global.fetch).toHaveBeenCalledWith(
      "main.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("prioritas 3: fallback ke video kalau seri_warna & image tidak ada", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "video/mp4" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductViaWA({ ...product, seri_warna: null, image: null, video: "https://example.com/v.mp4" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/v.mp4",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("guard busy: panggilan kedua yang overlap langsung resolve { method: 'busy' } tanpa fetch/share lagi", async () => {
    let resolveShare;
    navigator.share = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveShare = resolve; }),
    );
    navigator.canShare = vi.fn().mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });

    const firstCall = shareProductViaWA({ ...product, image: "main.jpg" });
    // Biarkan microtask fetch/blob pada panggilan pertama berjalan sampai
    // navigator.share() dipanggil (pending, belum resolve).
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const fetchCallsBeforeSecond = global.fetch.mock.calls.length;
    const shareCallsBeforeSecond = navigator.share.mock.calls.length;

    const secondResult = await shareProductViaWA({ ...product, image: "main.jpg" });
    expect(secondResult).toEqual({ method: "busy" });
    expect(global.fetch.mock.calls.length).toBe(fetchCallsBeforeSecond);
    expect(navigator.share.mock.calls.length).toBe(shareCallsBeforeSecond);

    // Selesaikan panggilan pertama supaya tidak bocor ke test lain.
    resolveShare(undefined);
    await firstCall;
  });

  it("InvalidStateError diperlakukan sama seperti AbortError: resolve 'aborted', TIDAK jatuh ke wa-link", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    const invalidStateError = Object.assign(new Error("busy"), { name: "InvalidStateError" });
    navigator.share = vi.fn().mockRejectedValue(invalidStateError);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductViaWA({ ...product, image: "main.jpg" });

    expect(result).toEqual({ method: "aborted" });
    expect(window.open).not.toHaveBeenCalled();
  });

  it("fallback ke share teks saja saat canShare menolak file", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(false);

    const result = await shareProductViaWA(product);

    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.any(String) }),
    );
    expect(navigator.share).not.toHaveBeenCalledWith(expect.objectContaining({ files: expect.anything() }));
    expect(result).toEqual({ method: "share-text" });
  });

  it("navigator.share tidak tersedia: SKIP fetch sama sekali, langsung wa-link (fix: hindari popup diblok karena delay fetch menghabiskan transient activation)", async () => {
    global.fetch = vi.fn();
    navigator.share = undefined;
    navigator.canShare = undefined;

    const result = await shareProductViaWA(product);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
    expect(result).toEqual({ method: "wa-link" });
  });

  it("kandidat prioritas tertinggi gagal fetch: TIDAK cascade ke kandidat berikutnya (batasi total delay pre-share, cegah transient activation habis — fix bug 'klik share gaada efek')", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("timeout"));
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductViaWA({
      ...product,
      seri_warna: "seri-warna.jpg",
      image: "main.jpg",
      video: "https://example.com/v.mp4",
    });

    // Hanya kandidat prioritas tertinggi (seri_warna) yang dicoba — TIDAK
    // fallback ke image lalu video seperti perilaku lama, karena tiap
    // percobaan tambahan menambah risiko transient user activation habis
    // sebelum navigator.share() sempat dipanggil.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "seri-warna.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(result).toEqual({ method: "share-text" });
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.any(String) }),
    );
  });

  it("fetch foto gagal/timeout tapi navigator.share tersedia: tetap lanjut ke share teks (tidak throw, tidak macet)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductViaWA({ ...product, image: "main.jpg" });

    expect(result).toEqual({ method: "share-text" });
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.any(String) }),
    );
  });

  it("fetch foto yang menggantung (network sangat lambat) dibatalkan lewat timeout, tidak menunggu tanpa batas", async () => {
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn().mockImplementation((url, { signal } = {}) => {
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const abortErr = new Error("aborted");
            abortErr.name = "AbortError";
            reject(abortErr);
          });
        });
      });
      navigator.share = vi.fn().mockResolvedValue(undefined);
      navigator.canShare = vi.fn().mockReturnValue(true);

      const pending = shareProductViaWA({ ...product, image: "main.jpg" });
      // Lewati timeout fetchWithTimeout (2500ms) tanpa melewati failsafe
      // shareInFlight (8000ms), supaya cuma satu mekanisme yang diuji.
      await vi.advanceTimersByTimeAsync(3000);
      const result = await pending;

      expect(result).toEqual({ method: "share-text" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("shareProductsViaWA", () => {
  const productA = { kode: "D-01-OSK", nama: "Gamis A", image: "a.jpg", seri_warna: null };
  const productB = { kode: "D-02-SFN", nama: "Mukena B", image: "b.jpg", seri_warna: null };

  let originalShare;
  let originalCanShare;
  let originalFetch;
  let originalOpen;

  beforeEach(() => {
    originalShare = navigator.share;
    originalCanShare = navigator.canShare;
    originalFetch = global.fetch;
    originalOpen = window.open;
    window.open = vi.fn();
  });

  afterEach(() => {
    navigator.share = originalShare;
    navigator.canShare = originalCanShare;
    global.fetch = originalFetch;
    window.open = originalOpen;
    vi.restoreAllMocks();
  });

  it("fetch semua foto kandidat PARALEL (bukan berurutan) & share dengan files gabungan", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductsViaWA([productA, productB]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith("a.jpg", expect.objectContaining({ signal: expect.anything() }));
    expect(global.fetch).toHaveBeenCalledWith("b.jpg", expect.objectContaining({ signal: expect.anything() }));
    expect(result).toEqual({ method: "share-file", fileCount: 2 });
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.arrayContaining([expect.any(File), expect.any(File)]), text: "bulk text" }),
    );
  });

  it("prioritas seri_warna > foto utama per-produk (sama seperti share single-produk)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductsViaWA([{ ...productA, seri_warna: "seri-a.jpg" }]);

    expect(global.fetch).toHaveBeenCalledWith("seri-a.jpg", expect.objectContaining({ signal: expect.anything() }));
  });

  it("satu produk gagal fetch fotonya: produk lain tetap ikut, share tetap jalan dgn file yg berhasil saja", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "a.jpg") return Promise.reject(new Error("timeout"));
      return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })) });
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductsViaWA([productA, productB]);

    expect(result).toEqual({ method: "share-file", fileCount: 1 });
  });

  it("produk tanpa image & seri_warna dilewati dari kandidat foto (tidak error)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const noImageProduct = { kode: "D-03-XXX", nama: "Tanpa Foto", image: null, seri_warna: null };
    const result = await shareProductsViaWA([noImageProduct]);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ method: "share-text" });
  });

  it("semua fetch foto gagal: fallback ke share teks saja (tidak macet, tidak throw)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductsViaWA([productA, productB]);

    expect(result).toEqual({ method: "share-text" });
    expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ text: "bulk text" }));
  });

  it("navigator.share tidak tersedia: langsung wa-link, TIDAK fetch foto sama sekali", async () => {
    global.fetch = vi.fn();
    navigator.share = undefined;
    navigator.canShare = undefined;

    const result = await shareProductsViaWA([productA, productB]);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
    expect(result).toEqual({ method: "wa-link" });
  });

  it("InvalidStateError diperlakukan sama seperti AbortError: resolve 'aborted', TIDAK jatuh ke wa-link", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    const invalidStateError = Object.assign(new Error("busy"), { name: "InvalidStateError" });
    navigator.share = vi.fn().mockRejectedValue(invalidStateError);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductsViaWA([productA]);

    expect(result).toEqual({ method: "aborted" });
    expect(window.open).not.toHaveBeenCalled();
  });

  it("guard shareInFlight DIPAKAI BERSAMA shareProductViaWA (single) — overlap keduanya sama-sama ditolak 'busy'", async () => {
    let resolveShare;
    navigator.share = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveShare = resolve; }),
    );
    navigator.canShare = vi.fn().mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });

    const firstCall = shareProductsViaWA([productA, productB]);
    // shareProductsViaWA melewati lebih banyak microtask hop (Promise.allSettled
    // atas 2 fetch+blob paralel) sebelum navigator.share() akhirnya dipanggil
    // dibanding versi single-produk — poll sampai benar-benar terpanggil,
    // bukan tebak jumlah tick tetap (rapuh & gampang flaky).
    for (let i = 0; i < 50 && navigator.share.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }
    expect(navigator.share).toHaveBeenCalled();

    const secondResult = await shareProductViaWA({ kode: "D-99-XXX", nama: "Lain", image: "c.jpg" });
    expect(secondResult).toEqual({ method: "busy" });

    resolveShare(undefined);
    await firstCall;
  });

  it("array kosong: tidak fetch apa pun, tetap share teks (bulk text kosong tapi valid)", async () => {
    global.fetch = vi.fn();
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductsViaWA([]);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ method: "share-text" });
  });
});

describe("filterAndSortProducts", () => {
  const P1 = { kode: "A-01", nama: "Zamrud", created_at: "2026-03-01", variants: [], warna: [] };
  const P2 = { kode: "A-02", nama: "Amanda", created_at: "2026-03-01", variants: [], warna: [] };
  const P3 = { kode: "A-03", nama: "Kaila", created_at: "2026-01-01", variants: [], warna: [] };
  const DEFAULT_FILTER = {
    size: "",
    warna: "",
    stokStatus: "semua",
    lokasi: "semua",
    hargaMin: "",
    hargaMax: "",
    hppMin: "",
    hppMax: "",
    sort: "terbaru",
  };

  it('default "terbaru": produk terbaru dibuat duluan, lalu nama A-Z sebagai tiebreak (permintaan Denny 2026-08)', () => {
    const result = filterAndSortProducts([P1, P2, P3], DEFAULT_FILTER);
    // P1 & P2 sama-sama created_at 2026-03-01 -> tiebreak nama (Amanda < Zamrud)
    // P3 created_at lebih lama -> paling akhir
    expect(result.map((p) => p.kode)).toEqual(["A-02", "A-01", "A-03"]);
  });

  it('sort "terlaris" tidak terpengaruh (tiebreak nama hanya berlaku utk "terbaru")', () => {
    const result = filterAndSortProducts([P1, P2, P3], { ...DEFAULT_FILTER, sort: "terlaris" }, {
      soldQtyMap: { "A-01": 5, "A-02": 10, "A-03": 1 },
    });
    expect(result.map((p) => p.kode)).toEqual(["A-02", "A-01", "A-03"]);
  });

  it('sort "nama-az" tetap murni alfabet (tidak terpengaruh created_at)', () => {
    const result = filterAndSortProducts([P1, P2, P3], { ...DEFAULT_FILTER, sort: "nama-az" });
    expect(result.map((p) => p.kode)).toEqual(["A-02", "A-03", "A-01"]);
  });

  it("search & filter tetap jalan normal sebelum sort diterapkan", () => {
    const result = filterAndSortProducts([P1, P2, P3], DEFAULT_FILTER, { search: "Amanda" });
    expect(result.map((p) => p.kode)).toEqual(["A-02"]);
  });
});
