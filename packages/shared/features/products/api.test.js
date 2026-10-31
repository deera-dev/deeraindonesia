import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchProducts } = await import("./api");

const validProduct = {
  kode: "D-07-OSK",
  nama: "Gamis Oscar",
  bahan: "OSK",
  hpp: 50000,
  image: null,
  video: null,
  seri_warna: null,
  detail: [],
  variants: [{ size: "Midi", harga: 150000, ld: 110, pb: 130 }],
  warna: ["HITAM"],
  warna_images: null,
  position: 0,
  created_at: "2026-01-01T00:00:00",
};

describe("fetchProducts", () => {
  beforeEach(() => {
    resetSupabaseMock(supabaseMock);
  });

  it("memanggil supabase.from('products') dengan select+order yang benar dan mengembalikan data", async () => {
    const data = [validProduct];
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data, error: null }));

    const result = await fetchProducts();

    expect(supabaseMock.from).toHaveBeenCalledWith("products");
    expect(result).toEqual(data);
  });

  it("melempar error saat data tidak sesuai schema (kolom wajib hilang)", async () => {
    const data = [{ kode: "D-07-OSK" }];
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data, error: null }));

    await expect(fetchProducts()).rejects.toThrow();
  });

  it("mengembalikan array kosong saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const result = await fetchProducts();

    expect(result).toEqual([]);
  });

  it("melempar error saat supabase mengembalikan error", async () => {
    const error = new Error("network down");
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error }));

    await expect(fetchProducts()).rejects.toThrow("network down");
  });
});
