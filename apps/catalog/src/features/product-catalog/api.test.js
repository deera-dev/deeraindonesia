import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchSoldOutKodes, fetchLimitedStokKodes } = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("fetchSoldOutKodes", () => {
  it("mengembalikan array kode dari hasil rpc", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ kode: "D-01-OSK" }, { kode: "D-02-SFN" }],
      error: null,
    });

    const result = await fetchSoldOutKodes();

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_sold_out_kodes");
    expect(result).toEqual(["D-01-OSK", "D-02-SFN"]);
  });

  it("mengembalikan [] saat error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const result = await fetchSoldOutKodes();
    expect(result).toEqual([]);
  });

  it("mengembalikan [] saat data null tanpa error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });
    const result = await fetchSoldOutKodes();
    expect(result).toEqual([]);
  });
});


describe("fetchLimitedStokKodes", () => {
  it("mengembalikan array kode dari hasil rpc", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ kode: "D-03-OSK" }],
      error: null,
    });

    const result = await fetchLimitedStokKodes();

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_limited_stok_kodes");
    expect(result).toEqual(["D-03-OSK"]);
  });

  it("mengembalikan [] saat error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const result = await fetchLimitedStokKodes();
    expect(result).toEqual([]);
  });

  it("mengembalikan [] saat data null tanpa error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });
    const result = await fetchLimitedStokKodes();
    expect(result).toEqual([]);
  });
});
