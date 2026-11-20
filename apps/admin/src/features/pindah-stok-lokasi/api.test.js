import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { moveStokLokasi } = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("moveStokLokasi", () => {
  // Identitas audit (user_email/user_name) sekarang diambil RPC dari
  // auth.uid() -> profiles, bukan parameter client lagi — lihat
  // supabase/migrations/20261120_move_stok_lokasi_identity.sql.
  it("memanggil rpc('move_stok_lokasi', ...) dengan p_from/p_to saja", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true, total_pcs: 10 }, error: null });

    const result = await moveStokLokasi({ fromLocation: "cideng", toLocation: "gudang" });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("move_stok_lokasi", {
      p_from: "cideng",
      p_to: "gudang",
    });
    expect(result).toEqual({ success: true, total_pcs: 10 });
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
    await expect(moveStokLokasi({ fromLocation: "gudang", toLocation: "gudang" })).rejects.toThrow(
      "Lokasi asal dan tujuan tidak boleh sama.",
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("RPC gagal -> error diteruskan sbg Error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(moveStokLokasi({ fromLocation: "cideng", toLocation: "gudang" })).rejects.toThrow(
      "db down",
    );
  });
});
