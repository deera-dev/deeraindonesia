import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { fetchLatestVersion } = await import("./api");

describe("fetchLatestVersion", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mengambil /version.json dengan cache no-store dan mengembalikan version", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: "abc123" }),
    });

    const result = await fetchLatestVersion();

    expect(result).toBe("abc123");
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/^\/version\.json\?t=\d+$/);
    expect(options).toEqual({ cache: "no-store" });
  });

  it("melempar error saat response tidak ok", async () => {
    global.fetch.mockResolvedValue({ ok: false });

    await expect(fetchLatestVersion()).rejects.toThrow("Gagal memeriksa versi terbaru");
  });
});
