import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const fetchStokByLocation = vi.fn();
vi.mock("./api", () => ({ fetchStokByLocation: (...args) => fetchStokByLocation(...args) }));

const { useStokByLocationQuery } = await import("./queries");

describe("useStokByLocationQuery", () => {
  beforeEach(() => {
    fetchStokByLocation.mockReset();
  });

  it("memanggil fetchStokByLocation dengan location dan mengembalikan data saat enabled", async () => {
    const data = [{ kode: "D-07-OSK" }];
    fetchStokByLocation.mockResolvedValue(data);

    const { result } = renderHook(() => useStokByLocationQuery("gudang"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchStokByLocation).toHaveBeenCalledWith("gudang");
    expect(result.current.data).toBe(data);
  });

  it("tidak memanggil fetchStokByLocation saat location falsy (query disabled)", () => {
    const { result } = renderHook(() => useStokByLocationQuery(null), {
      wrapper: createQueryWrapper(),
    });

    expect(fetchStokByLocation).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });
});
