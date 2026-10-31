import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { rpc: (...a) => rpc(...a) } }));

import { fetchPasarRestock } from "./api";

beforeEach(() => rpc.mockReset());

describe("fetchPasarRestock", () => {
  it("memanggil RPC get_pasar_restock dengan pasar tujuan", async () => {
    rpc.mockResolvedValue({
      data: { restock: [{ kode: "D-01" }], tidak_bergerak: [] },
      error: null,
    });
    await expect(fetchPasarRestock("cideng")).resolves.toEqual({
      restock: [{ kode: "D-01" }],
      tidak_bergerak: [],
    });
    expect(rpc).toHaveBeenCalledWith("get_pasar_restock", { p_market: "cideng" });
  });
  it("tanpa market -> kosong tanpa memanggil RPC", async () => {
    await expect(fetchPasarRestock(null)).resolves.toEqual({ restock: [], tidak_bergerak: [] });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("melempar error dari RPC", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("x") });
    await expect(fetchPasarRestock("cideng")).rejects.toThrow("x");
  });
});
