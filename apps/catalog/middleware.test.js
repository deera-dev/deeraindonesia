import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@vercel/edge", () => ({ next: () => new Response(null, { headers: { "x-next": "1" } }) }));
const { default: middleware } = await import("./middleware.js");

const BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HUMAN = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1";
const rows = [
  { kode: "D-1-OSK", nama: "Gamis A", bahan: "Katun", image: "https://res.cloudinary.com/x/image/upload/v1/a.jpg" },
  { kode: "D-2-OSK", nama: "Gamis <B>", bahan: null, image: "https://res.cloudinary.com/x/image/upload/v1/b.jpg" },
];

function req(path, ua) {
  return new Request(`https://deera.id${path}`, { headers: { "user-agent": ua } });
}

describe("middleware katalog", () => {
  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = "https://x.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "key";
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
  });
  afterEach(() => vi.restoreAllMocks());

  it("pengunjung biasa diteruskan ke aplikasi", async () => {
    const res = await middleware(req("/catalog", HUMAN));
    expect(res.headers.get("x-next")).toBe("1");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("crawler di /catalog mendapat daftar produk + JSON-LD ItemList dengan tautan", async () => {
    const res = await middleware(req("/catalog", BOT));
    const html = await res.text();
    expect(html).toContain("<h1>");
    expect(html).toContain('href="https://deera.id/code/D-1-OSK"');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain("Gamis &lt;B&gt;"); // di-escape
    expect(html).toContain('<link rel="canonical" href="https://deera.id/catalog" />');
  });

  it("crawler di / juga mendapat versi katalog", async () => {
    const res = await middleware(req("/", BOT));
    expect(await res.text()).toContain("ItemList");
  });

  it("jatuh ke aplikasi bila data produk gagal diambil", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const res = await middleware(req("/catalog", BOT));
    expect(res.headers.get("x-next")).toBe("1");
  });
});
