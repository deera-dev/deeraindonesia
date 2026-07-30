import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => (url ? `cld:${url}` : url),
}));

const { buildShareText, shareProductViaWA, getAdjacentKodes } = await import("./utils");

describe("buildShareText", () => {
  it("tidak menyertakan harga sama sekali", () => {
    const text = buildShareText({
      kode: "D-07-OSK",
      nama: "Gamis Dewi",
      bahan: "Ceruti Babydoll",
      variants: [{ size: "Midi", harga: 250000 }],
    });
    expect(text).not.toMatch(/harga/i);
    expect(text).not.toContain("250000");
    expect(text).not.toContain("Rp");
  });

  it("menyertakan kode, nama, bahan, & link katalog", () => {
    const text = buildShareText({ kode: "D-07-OSK", nama: "Gamis Dewi", bahan: "Ceruti" });
    expect(text).toContain("D-07-OSK");
    expect(text).toContain("Gamis Dewi");
    expect(text).toContain("Bahan: Ceruti");
    expect(text).toContain("https://catalog.deera.id/code/D-07-OSK");
  });

  it("tidak menampilkan baris Bahan saat product.bahan kosong", () => {
    const text = buildShareText({ kode: "D-07-OSK", nama: "Gamis Dewi" });
    expect(text).not.toContain("Bahan:");
  });
});

describe("shareProductViaWA", () => {
  const product = {
    kode: "D-07-OSK",
    nama: "Gamis Dewi",
    image: "gamis-dewi.jpg",
    video: null,
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

  it("share dengan foto saat navigator.share & canShare mendukung file", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductViaWA(product);

    expect(global.fetch).toHaveBeenCalledWith(
      "cld:gamis-dewi.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array), text: expect.any(String) }),
    );
    expect(result).toEqual({ method: "share-file" });
  });

  it("coba foto utama dulu sebelum video (video jadi prioritas terakhir)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductViaWA({ ...product, image: "gamis-dewi.jpg", video: "https://example.com/v.mp4" });

    expect(global.fetch).toHaveBeenCalledWith(
      "cld:gamis-dewi.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1); // tidak lanjut fetch video karena foto utama sukses
  });

  it("prioritas 1: memakai foto seri_warna kalau ada (mengalahkan image & video)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductViaWA({
      ...product,
      seri_warna: "seri-warna.jpg",
      image: "gamis-dewi.jpg",
      video: "https://example.com/v.mp4",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "cld:seri-warna.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("fallback ke foto utama saat fetch foto seri_warna gagal/404", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false }) // seri_warna gagal
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
      });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductViaWA({
      ...product,
      seri_warna: "seri-warna.jpg",
      image: "gamis-dewi.jpg",
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "cld:seri-warna.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "cld:gamis-dewi.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
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

    const firstCall = shareProductViaWA(product);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const fetchCallsBeforeSecond = global.fetch.mock.calls.length;
    const shareCallsBeforeSecond = navigator.share.mock.calls.length;

    const secondResult = await shareProductViaWA(product);
    expect(secondResult).toEqual({ method: "busy" });
    expect(global.fetch.mock.calls.length).toBe(fetchCallsBeforeSecond);
    expect(navigator.share.mock.calls.length).toBe(shareCallsBeforeSecond);

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

    const result = await shareProductViaWA(product);

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

  it("mengembalikan method 'aborted' saat user membatalkan share", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    navigator.share = vi.fn().mockRejectedValue(abortError);
    navigator.canShare = vi.fn().mockReturnValue(false);

    const result = await shareProductViaWA(product);
    expect(result).toEqual({ method: "aborted" });
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

  it("fetch foto gagal/timeout tapi navigator.share tersedia: tetap lanjut ke share teks (tidak throw, tidak macet)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareProductViaWA(product);

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

      const pending = shareProductViaWA(product);
      await vi.advanceTimersByTimeAsync(3000);
      const result = await pending;

      expect(result).toEqual({ method: "share-text" });
    } finally {
      vi.useRealTimers();
    }
  });
});


describe("getAdjacentKodes", () => {
  const products = [
    { kode: "A", image: "a.jpg", created_at: "2026-01-01" },
    { kode: "B", image: "b.jpg", created_at: "2026-02-01" },
    { kode: "C", image: "c.jpg", created_at: "2026-03-01" },
  ];
  // urutan sortCatalogProducts (created_at desc): C, B, A

  it("produk di tengah punya prevKode & nextKode", () => {
    const result = getAdjacentKodes(products, "B");
    expect(result).toEqual({ prevKode: "C", nextKode: "A", position: 2, total: 3 });
  });

  it("produk pertama (posisi 1) prevKode null", () => {
    const result = getAdjacentKodes(products, "C");
    expect(result.prevKode).toBeNull();
    expect(result.nextKode).toBe("B");
    expect(result.position).toBe(1);
  });

  it("produk terakhir nextKode null", () => {
    const result = getAdjacentKodes(products, "A");
    expect(result.nextKode).toBeNull();
    expect(result.prevKode).toBe("B");
  });

  it("kode tidak ditemukan mengembalikan prevKode/nextKode null & position 0", () => {
    const result = getAdjacentKodes(products, "ZZZ");
    expect(result).toEqual({ prevKode: null, nextKode: null, position: 0, total: 3 });
  });

  it("fallback aman saat products null/undefined", () => {
    expect(getAdjacentKodes(null, "A")).toEqual({
      prevKode: null,
      nextKode: null,
      position: 0,
      total: 0,
    });
  });
});
