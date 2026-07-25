import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => (url ? `cld:${url}` : url),
}));

const { buildFavoritesShareText, shareFavoritesViaWA } = await import("./utils");

const products = [
  { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" },
  { kode: "D-08-SFN", nama: "Mukena Aisyah", image: "mukena-aisyah.jpg" },
];

describe("buildFavoritesShareText", () => {
  it("tidak menyertakan harga", () => {
    const text = buildFavoritesShareText(products);
    expect(text).not.toMatch(/harga/i);
    expect(text).not.toContain("Rp");
  });

  it("mencantumkan kode, nama, & link tiap produk", () => {
    const text = buildFavoritesShareText(products);
    expect(text).toContain("D-07-OSK");
    expect(text).toContain("Gamis Dewi");
    expect(text).toContain("https://catalog.deera.id/code/D-07-OSK");
    expect(text).toContain("D-08-SFN");
    expect(text).toContain("https://catalog.deera.id/code/D-08-SFN");
  });
});

describe("shareFavoritesViaWA", () => {
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

  it("melampirkan foto dari tiap produk & share sekali lewat navigator.share", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    const result = await shareFavoritesViaWA(products);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array), text: expect.any(String) }),
    );
    const shareArg = navigator.share.mock.calls[0][0];
    expect(shareArg.files).toHaveLength(2);
    expect(result).toEqual({ method: "share-file" });
  });

  it("membatasi jumlah foto yang diunduh maksimal 6 produk", async () => {
    const manyProducts = Array.from({ length: 10 }, (_, i) => ({
      kode: `D-${i}`,
      nama: `Produk ${i}`,
      image: `img-${i}.jpg`,
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareFavoritesViaWA(manyProducts);

    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  it("fallback wa.me saat navigator.share tidak tersedia", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    navigator.share = undefined;
    navigator.canShare = undefined;

    const result = await shareFavoritesViaWA(products);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
    expect(result).toEqual({ method: "wa-link" });
  });

  it("mengembalikan method 'aborted' saat user membatalkan share", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    navigator.share = vi.fn().mockRejectedValue(abortError);
    navigator.canShare = vi.fn().mockReturnValue(false);

    const result = await shareFavoritesViaWA(products);
    expect(result).toEqual({ method: "aborted" });
  });

  it("melewati produk tanpa image", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);

    await shareFavoritesViaWA([{ kode: "D-99", nama: "Tanpa Foto" }]);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
