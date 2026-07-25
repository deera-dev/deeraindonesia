import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";

const fetchSoldOutKodes = vi.fn();
const fetchLimitedStokKodes = vi.fn();
vi.mock("./api", () => ({
  fetchSoldOutKodes: (...args) => fetchSoldOutKodes(...args),
  fetchLimitedStokKodes: (...args) => fetchLimitedStokKodes(...args),
}));

const { useSoldOutKodesQuery, useLimitedStokKodesQuery, soldOutKeys, limitedStokKeys } =
  await import("./queries");

beforeEach(() => {
  fetchSoldOutKodes.mockReset().mockResolvedValue(["D-01-OSK"]);
  fetchLimitedStokKodes.mockReset().mockResolvedValue(["D-03-OSK"]);
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
