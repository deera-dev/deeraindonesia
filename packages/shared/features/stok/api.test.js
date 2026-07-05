import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchStokByLocation } = await import("./api");

describe("fetchStokByLocation", () => {
  beforeEach(() => {
    resetSupabaseMock(supabaseMock);
  });

  it("mengembalikan array kosong segera tanpa memanggil supabase saat location falsy", async () => {
    const result = await fetchStokByLocation(null);

    expect(result).toEqual([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("mengembalikan array kosong saat location berupa string kosong", async () => {
    const result = await fetchStokByLocation("");

    expect(result).toEqual([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("memanggil supabase.from('stok_warna') dengan filter gt(location, 0) dan mengembalikan data", async () => {
    const data = [{ id: "1", kode: "D-07-OSK", size: "Midi", warna: "HITAM", gudang: 5 }];
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data, error: null }));

    const result = await fetchStokByLocation("gudang");

    expect(supabaseMock.from).toHaveBeenCalledWith("stok_warna");
    expect(result).toBe(data);
  });

  it("mengembalikan array kosong saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const result = await fetchStokByLocation("cideng");

    expect(result).toEqual([]);
  });

  it("melempar error saat supabase mengembalikan error", async () => {
    const error = new Error("query failed");
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error }));

    await expect(fetchStokByLocation("tegalgubug")).rejects.toThrow("query failed");
  });
});
