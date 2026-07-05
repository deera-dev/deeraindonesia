import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";

const fetchSoldOutKodes = vi.fn();
vi.mock("./api", () => ({ fetchSoldOutKodes: (...args) => fetchSoldOutKodes(...args) }));

const { useSoldOutKodesQuery, soldOutKeys } = await import("./queries");

beforeEach(() => {
  fetchSoldOutKodes.mockReset().mockResolvedValue(["D-01-OSK"]);
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
