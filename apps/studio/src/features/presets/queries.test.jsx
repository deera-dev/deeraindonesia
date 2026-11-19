import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchBackgroundPresets: vi.fn().mockResolvedValue([{ id: "bg1" }]),
  createBackgroundPreset: vi.fn().mockResolvedValue({ id: "bg2" }),
  updateBackgroundPreset: vi.fn().mockResolvedValue({ id: "bg1" }),
  deleteBackgroundPreset: vi.fn().mockResolvedValue(undefined),
  fetchAccessoryPresets: vi.fn().mockResolvedValue([{ id: "acc1" }]),
  createAccessoryPreset: vi.fn().mockResolvedValue({ id: "acc2" }),
  updateAccessoryPreset: vi.fn().mockResolvedValue({ id: "acc1" }),
  deleteAccessoryPreset: vi.fn().mockResolvedValue(undefined),
}));

import {
  presetKeys,
  useAccessoryPresetsQuery,
  useBackgroundPresetsQuery,
  useCreateAccessoryPresetMutation,
  useCreateBackgroundPresetMutation,
  useDeleteAccessoryPresetMutation,
  useDeleteBackgroundPresetMutation,
  useUpdateAccessoryPresetMutation,
  useUpdateBackgroundPresetMutation,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("presetKeys", () => {
  it("has distinct keys for background and accessory", () => {
    expect(presetKeys.background).toEqual(["presets", "background"]);
    expect(presetKeys.accessory).toEqual(["presets", "accessory"]);
  });
});

describe("background queries/mutations", () => {
  it("useBackgroundPresetsQuery fetches", async () => {
    const { result } = renderHook(() => useBackgroundPresetsQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("useCreateBackgroundPresetMutation runs and invalidates", async () => {
    const { result } = renderHook(() => useCreateBackgroundPresetMutation(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        name: "A",
        prompt_fragment: "p",
        reference_image_url: null,
        mood_tags: [],
        warna_affinity: [],
        cocok_untuk_kategori: [],
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateBackgroundPresetMutation runs and invalidates", async () => {
    const { result } = renderHook(() => useUpdateBackgroundPresetMutation(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({ id: "bg1", patch: { is_active: false } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteBackgroundPresetMutation runs and invalidates", async () => {
    const { result } = renderHook(() => useDeleteBackgroundPresetMutation(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync("bg1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("accessory queries/mutations", () => {
  it("useAccessoryPresetsQuery fetches", async () => {
    const { result } = renderHook(() => useAccessoryPresetsQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("useCreateAccessoryPresetMutation runs and invalidates", async () => {
    const { result } = renderHook(() => useCreateAccessoryPresetMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        category: "tas",
        name: "A",
        prompt_fragment: "p",
        reference_image_url: null,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateAccessoryPresetMutation runs and invalidates", async () => {
    const { result } = renderHook(() => useUpdateAccessoryPresetMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: "acc1", patch: { is_active: false } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteAccessoryPresetMutation runs and invalidates", async () => {
    const { result } = renderHook(() => useDeleteAccessoryPresetMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync("acc1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
