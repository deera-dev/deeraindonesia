import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./queries", () => ({
  useBackgroundPresetsQuery: vi.fn(() => ({
    data: [{ id: "bg1" }],
    isLoading: false,
    error: null,
  })),
  useCreateBackgroundPresetMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateBackgroundPresetMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteBackgroundPresetMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useAccessoryPresetsQuery: vi.fn(() => ({
    data: [{ id: "acc1" }],
    isLoading: false,
    error: null,
  })),
  useCreateAccessoryPresetMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateAccessoryPresetMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteAccessoryPresetMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import {
  useAccessoryPresets,
  useBackgroundPresets,
  useCreateAccessoryPreset,
  useCreateBackgroundPreset,
  useDeleteAccessoryPreset,
  useDeleteBackgroundPreset,
  useUpdateAccessoryPreset,
  useUpdateBackgroundPreset,
} from "./hooks";
import { useAccessoryPresetsQuery, useBackgroundPresetsQuery } from "./queries";

function wrapper() {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useBackgroundPresets / useAccessoryPresets", () => {
  it("returns background presets and loading=false", () => {
    const { result } = renderHook(() => useBackgroundPresets(), { wrapper: wrapper() });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it("returns [] when background data is undefined", () => {
    useBackgroundPresetsQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { result } = renderHook(() => useBackgroundPresets(), { wrapper: wrapper() });
    expect(result.current.presets).toEqual([]);
  });

  it("returns accessory presets and loading=false", () => {
    const { result } = renderHook(() => useAccessoryPresets(), { wrapper: wrapper() });
    expect(result.current.presets).toHaveLength(1);
  });

  it("returns [] when accessory data is undefined", () => {
    useAccessoryPresetsQuery.mockReturnValueOnce({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useAccessoryPresets(), { wrapper: wrapper() });
    expect(result.current.presets).toEqual([]);
  });
});

describe("function hooks", () => {
  it("background CRUD hooks return functions", () => {
    expect(
      typeof renderHook(() => useCreateBackgroundPreset(), { wrapper: wrapper() }).result.current,
    ).toBe("function");
    expect(
      typeof renderHook(() => useUpdateBackgroundPreset(), { wrapper: wrapper() }).result.current,
    ).toBe("function");
    expect(
      typeof renderHook(() => useDeleteBackgroundPreset(), { wrapper: wrapper() }).result.current,
    ).toBe("function");
  });

  it("accessory CRUD hooks return functions", () => {
    expect(
      typeof renderHook(() => useCreateAccessoryPreset(), { wrapper: wrapper() }).result.current,
    ).toBe("function");
    expect(
      typeof renderHook(() => useUpdateAccessoryPreset(), { wrapper: wrapper() }).result.current,
    ).toBe("function");
    expect(
      typeof renderHook(() => useDeleteAccessoryPreset(), { wrapper: wrapper() }).result.current,
    ).toBe("function");
  });
});
