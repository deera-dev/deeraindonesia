import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const getCurrentUser = vi.fn();
const verifyPassword = vi.fn();
const displayName = vi.fn();
vi.mock("@deera/shared/features/auth/hooks", () => ({
  getCurrentUser: (...a) => getCurrentUser(...a),
  verifyPassword: (...a) => verifyPassword(...a),
  displayName: (...a) => displayName(...a),
}));

const mutateAsync = vi.fn();
vi.mock("./queries", () => ({
  useMoveStokLokasiMutation: () => ({ mutateAsync }),
}));

const { useMoveStokLokasi } = await import("./hooks");

beforeEach(() => {
  getCurrentUser.mockReset();
  verifyPassword.mockReset();
  displayName.mockReset();
  mutateAsync.mockReset();
});

describe("useMoveStokLokasi", () => {
  it("verifikasi password lalu memanggil mutateAsync dengan actorEmail/actorName saat password benar", async () => {
    getCurrentUser.mockResolvedValue({ email: "dika@deera.id", user_metadata: { full_name: "Dika" } });
    verifyPassword.mockResolvedValue(true);
    displayName.mockReturnValue("DIKA");
    mutateAsync.mockResolvedValue({ success: true, total_pcs: 7 });

    const { result } = renderHook(() => useMoveStokLokasi());
    const moveStokLokasi = result.current;

    const out = await moveStokLokasi({ fromLocation: "cideng", toLocation: "gudang", password: "secret123" });

    expect(verifyPassword).toHaveBeenCalledWith("dika@deera.id", "secret123");
    expect(mutateAsync).toHaveBeenCalledWith({
      fromLocation: "cideng",
      toLocation: "gudang",
      actorEmail: "dika@deera.id",
      actorName: "DIKA",
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
