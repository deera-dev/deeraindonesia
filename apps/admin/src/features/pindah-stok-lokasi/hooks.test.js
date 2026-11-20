import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const verifyPassword = vi.fn();
vi.mock("@deera/shared/features/auth/hooks", () => ({
  getCurrentUser: (...a) => getCurrentUser(...a),
  verifyPassword: (...a) => verifyPassword(...a),
}));

const mutateAsync = vi.fn();
vi.mock("./queries", () => ({
  useMoveStokLokasiMutation: () => ({ mutateAsync }),
}));

const { useMoveStokLokasi } = await import("./hooks");

beforeEach(() => {
  getCurrentUser.mockReset();
  verifyPassword.mockReset();
  mutateAsync.mockReset();
});

describe("useMoveStokLokasi", () => {
  // Identitas audit sekarang diambil RPC dari auth.uid() -> profiles,
  // bukan dikirim dari hooks.js lagi — lihat
  // supabase/migrations/20261120_move_stok_lokasi_identity.sql. Password
  // re-confirm TETAP di client (ini TIDAK berubah).
  it("verifikasi password lalu memanggil mutateAsync dengan fromLocation/toLocation saat password benar", async () => {
    getCurrentUser.mockResolvedValue({
      email: "dika@deera.id",
      user_metadata: { full_name: "Dika" },
    });
    verifyPassword.mockResolvedValue(true);
    mutateAsync.mockResolvedValue({ success: true, total_pcs: 7 });

    const { result } = renderHook(() => useMoveStokLokasi());
    const moveStokLokasi = result.current;

    const out = await moveStokLokasi({
      fromLocation: "cideng",
      toLocation: "gudang",
      password: "secret123",
    });

    expect(verifyPassword).toHaveBeenCalledWith("dika@deera.id", "secret123");
    expect(mutateAsync).toHaveBeenCalledWith({
      fromLocation: "cideng",
      toLocation: "gudang",
    });
    expect(out).toEqual({ success: true, total_pcs: 7 });
  });

  it("melempar 'Password salah.' saat verifyPassword gagal, tidak memanggil mutateAsync", async () => {
    getCurrentUser.mockResolvedValue({ email: "dika@deera.id" });
    verifyPassword.mockResolvedValue(false);

    const { result } = renderHook(() => useMoveStokLokasi());

    await expect(
      result.current({ fromLocation: "cideng", toLocation: "gudang", password: "salah" }),
    ).rejects.toThrow("Password salah.");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("melempar error saat tidak ada sesi login, tidak memanggil verifyPassword", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useMoveStokLokasi());

    await expect(
      result.current({ fromLocation: "cideng", toLocation: "gudang", password: "apapun" }),
    ).rejects.toThrow("Sesi login tidak ditemukan, silakan login ulang.");
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
