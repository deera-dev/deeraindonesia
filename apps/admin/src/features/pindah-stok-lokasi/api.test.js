import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { moveStokLokasi } = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("moveStokLokasi", () => {
  it("memanggil rpc('move_stok_lokasi', ...) dengan parameter yang benar", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true, total_pcs: 10 }, error: null });

    const result = await moveStokLokasi({
      fromLocation: "cideng",
      toLocation: "gudang",
      actorEmail: "dika@deera.id",
      actorName: "DIKA",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("move_stok_lokasi", {
      p_from: "cideng",
      p_to: "gudang",
      p_actor_email: "dika@deera.id",
      p_actor_name: "DIKA",
    });
    expect(result).toEqual({ success: true, total_pcs: 10 });
  });

  it("tanpa actorEmail/actorName -> null dan '-'", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await moveStokLokasi({ fromLocation: "cideng", toLocation: "gudang" });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("move_stok_lokasi", {
      p_from: "cideng",
      p_to: "gudang",
      p_actor_email: null,
      p_actor_name: "-",
    });
  });

  it("menolak lokasi asal tidak valid tanpa memanggil rpc", async () => {
    await expect(
      moveStokLokasi({ fromLocation: "reseller-budi", toLocation: "gudang" }),
    ).rejects.toThrow("Lokasi tidak valid.");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("menolak lokasi tujuan tidak valid tanpa memanggil rpc", async () => {
    await expect(
      moveStokLokasi({ fromLocation: "gudang", toLocation: "reseller-budi" }),
    ).rejects.toThrow("Lokasi tidak valid.");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("menolak lokasi asal dan tujuan sama tanpa memanggil rpc", async () => {
    await expect(
      moveStokLokasi({ fromLocation: "gudang", toLocation: "gudang" }),
    ).rejects.toThrow("Lokasi asal dan tujuan tidak boleh sama.");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("RPC gagal -> error diteruskan sbg Error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(
      moveStokLokasi({ fromLocation: "cideng", toLocation: "gudang" }),
    ).rejects.toThrow("db down");
  });
});
