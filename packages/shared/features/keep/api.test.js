import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchActiveKeepItems } = await import("./api");

describe("fetchActiveKeepItems", () => {
  beforeEach(() => {
    resetSupabaseMock(supabaseMock);
  });

  it("memanggil supabase.from('keep_orders') dgn filter status='aktif' dan meng-flatten items semua baris", async () => {
    const data = [
      { items: [{ kode: "D-07-OSK", qty: 2 }] },
      { items: [{ kode: "D-08-OSK", qty: 1 }, { kode: "D-09-OSK", qty: 3 }] },
    ];
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data, error: null }));

    const result = await fetchActiveKeepItems();

    expect(supabaseMock.from).toHaveBeenCalledWith("keep_orders");
    expect(result).toEqual([
      { kode: "D-07-OSK", qty: 2 },
      { kode: "D-08-OSK", qty: 1 },
      { kode: "D-09-OSK", qty: 3 },
    ]);
  });

  it("mengembalikan array kosong saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const result = await fetchActiveKeepItems();
    expect(result).toEqual([]);
  });

  it("baris tanpa items (null) diabaikan, bukan error", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ data: [{ items: null }, { items: [{ kode: "D-01-ABC", qty: 1 }] }], error: null }),
    );
    const result = await fetchActiveKeepItems();
    expect(result).toEqual([{ kode: "D-01-ABC", qty: 1 }]);
  });

  it("melempar error saat supabase mengembalikan error", async () => {
    const error = new Error("query failed");
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error }));
    await expect(fetchActiveKeepItems()).rejects.toThrow("query failed");
  });
});
