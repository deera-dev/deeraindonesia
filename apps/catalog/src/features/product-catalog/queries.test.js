import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";

const fetchSoldOutKodes = vi.fn();
const fetchLimitedStokKodes = vi.fn();
const fetchBaruKodes = vi.fn();
const fetchTerlarisKodes = vi.fn();
vi.mock("./api", () => ({
  fetchSoldOutKodes: (...args) => fetchSoldOutKodes(...args),
  fetchLimitedStokKodes: (...args) => fetchLimitedStokKodes(...args),
  fetchBaruKodes: (...args) => fetchBaruKodes(...args),
  fetchTerlarisKodes: (...args) => fetchTerlarisKodes(...args),
}));

const {
  useSoldOutKodesQuery,
  useLimitedStokKodesQuery,
  useBaruKodesQuery,
  useTerlarisKodesQuery,
  soldOutKeys,
  limitedStokKeys,
  baruKeys,
  terlarisKeys,
} = await import("./queries");

beforeEach(() => {
  fetchSoldOutKodes.mockReset().mockResolvedValue(["D-01-OSK"]);
  fetchLimitedStokKodes.mockReset().mockResolvedValue(["D-03-OSK"]);
  fetchBaruKodes.mockReset().mockResolvedValue(["D-04-OSK"]);
  fetchTerlarisKodes.mockReset().mockResolvedValue([{ kode: "D-05-OSK", periode: "7d" }]);
});

describe("soldOutKeys", () => {
  it("punya bentuk key yang stabil", () => {
    expect(soldOutKeys.all).toEqual(["sold-out-kodes"]);
  });
});

describe("useSoldOutKodesQuery", () => {
  it("fetch sold-out kodes via fetchSoldOutKodes", async () => {
    const { result } = renderHook(() => useSoldOutKodesQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSoldOutKodes).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(["D-01-OSK"]);
  });
});


describe("limitedStokKeys", () => {
  it("punya bentuk key yang stabil", () => {
    expect(limitedStokKeys.all).toEqual(["limited-stok-kodes"]);
  });
});

describe("useLimitedStokKodesQuery", () => {
  it("fetch limited-stok kodes via fetchLimitedStokKodes", async () => {
    const { result } = renderHook(() => useLimitedStokKodesQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchLimitedStokKodes).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(["D-03-OSK"]);
  });
});


describe("baruKeys", () => {
  it("punya bentuk key yang stabil", () => {
    expect(baruKeys.all).toEqual(["baru-kodes"]);
  });
});

describe("useBaruKodesQuery", () => {
  it("fetch baru kodes via fetchBaruKodes", async () => {
    const { result } = renderHook(() => useBaruKodesQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchBaruKodes).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(["D-04-OSK"]);
  });
});


describe("terlarisKeys", () => {
  it("punya bentuk key yang stabil", () => {
    expect(terlarisKeys.all).toEqual(["terlaris-kodes"]);
  });
});

describe("useTerlarisKodesQuery", () => {
  it("fetch terlaris kodes via fetchTerlarisKodes", async () => {
    const { result } = renderHook(() => useTerlarisKodesQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchTerlarisKodes).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ kode: "D-05-OSK", periode: "7d" }]);
  });
});
