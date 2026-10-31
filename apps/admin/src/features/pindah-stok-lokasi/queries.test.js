import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { stokOpnameKeys } from "../stok-opname/queries";

const moveStokLokasiMock = vi.fn();
vi.mock("./api", () => ({
  moveStokLokasi: (...a) => moveStokLokasiMock(...a),
}));

const { useMoveStokLokasiMutation } = await import("./queries");

beforeEach(() => {
  moveStokLokasiMock.mockReset();
});

describe("useMoveStokLokasiMutation", () => {
  it("memanggil moveStokLokasi & invalidateQueries(stokOpnameKeys.all) saat sukses", async () => {
    moveStokLokasiMock.mockResolvedValue({ success: true, total_pcs: 5 });
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useMoveStokLokasiMutation(), {
      wrapper: createQueryWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ fromLocation: "cideng", toLocation: "gudang" });
    });

    expect(moveStokLokasiMock.mock.calls[0][0]).toEqual({
      fromLocation: "cideng",
      toLocation: "gudang",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stokOpnameKeys.all });
  });

  it("tidak invalidateQueries saat gagal", async () => {
    moveStokLokasiMock.mockRejectedValue(new Error("Password salah."));
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useMoveStokLokasiMutation(), {
      wrapper: createQueryWrapper(qc),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ fromLocation: "cideng", toLocation: "gudang" }),
      ).rejects.toThrow("Password salah.");
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
