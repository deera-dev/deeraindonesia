import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchProducts } = await import("./api");

describe("fetchProducts", () => {
  beforeEach(() => {
    resetSupabaseMock(supabaseMock);
  });

  it("memanggil supabase.from('products') dengan select+order yang benar dan mengembalikan data", async () => {
    const data = [{ id: "1", kode: "D-07-OSK" }];
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data, error: null }));

    const result = await fetchProducts();

    expect(supabaseMock.from).toHaveBeenCalledWith("products");
    expect(result).toBe(data);
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
