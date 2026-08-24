import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useStokAllQuery: vi.fn(),
  useSoldKodesQuery: vi.fn(),
}));

import { useStokAll, useSoldKodes } from "./hooks";
import { useStokAllQuery, useSoldKodesQuery } from "./queries";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
  useStokAllQuery.mockReturnValue({ data: [{ id: "s1" }], isLoading: false });
  useSoldKodesQuery.mockReturnValue({ data: ["D-01-OSK"], isLoading: false });
});

describe("useStokAll", () => {
  it("returns stok and loading=false", () => {
    const { result } = renderHook(() => useStokAll(), { wrapper });
    expect(result.current.stok).toEqual([{ id: "s1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useStokAllQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useStokAll(), { wrapper });
    expect(result.current.stok).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useSoldKodes", () => {
  it("returns soldKodes and loading=false", () => {
    const { result } = renderHook(() => useSoldKodes("cideng", "2026-08-01"), { wrapper });
    expect(result.current.soldKodes).toEqual(["D-01-OSK"]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useSoldKodesQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useSoldKodes("cideng", "2026-08-01"), { wrapper });
    expect(result.current.soldKodes).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
