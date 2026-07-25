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

    expect(global.fetch).toHaveBeenCalledWith("cld:gamis-dewi.jpg");
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array), text: expect.any(String) }),
    );
    expect(result).toEqual({ method: "share-file" });
  });

  it("coba video dulu sebelum foto saat product.video ada", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "video/mp4" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareProductViaWA({ ...product, video: "https://example.com/v.mp4" });

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/v.mp4");
    expect(global.fetch).toHaveBeenCalledTimes(1); // tidak lanjut fetch foto karena video sukses
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

  it("fallback wa.me saat navigator.share tidak tersedia (desktop)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    navigator.share = undefined;
    navigator.canShare = undefined;

    const result = await shareProductViaWA(product);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
    expect(result).toEqual({ method: "wa-link" });
  });

  it("tetap lanjut (tidak throw) saat fetch foto/video gagal karena network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    navigator.share = undefined;

    const result = await shareProductViaWA(product);
    expect(result).toEqual({ method: "wa-link" });
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
