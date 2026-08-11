import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useHppTemplatesQuery:        vi.fn(),
  useHppConfigQuery:           vi.fn(),
  useHppConfigRowsQuery:       vi.fn(),
  useBahanOptionsQuery:        vi.fn(),
  useSaveHppTemplatesMutation: vi.fn(),
  useDeleteHppTemplateMutation: vi.fn(),
  useSaveHppConfigMutation:    vi.fn(),
}));

import {
  useHppTemplates, useHppConfig, useHppConfigRows, useBahanOptions,
  useSaveHppTemplates, useDeleteHppTemplate, useSaveHppConfig, useHppTemplateFilter,
} from "./hooks";
import {
  useHppTemplatesQuery, useHppConfigQuery, useHppConfigRowsQuery, useBahanOptionsQuery,
  useSaveHppTemplatesMutation, useDeleteHppTemplateMutation, useSaveHppConfigMutation,
} from "./queries";
import { useHppTemplateFilterStore, DEFAULT_HPP_FILTER } from "./store";
import { act } from "@testing-library/react";

const wrapper = createWrapper();
const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useHppTemplatesQuery.mockReturnValue({ data: [{ id: "1" }], isLoading: false });
  useHppConfigQuery.mockReturnValue({ data: { plastik: 1800 } });
  useHppConfigRowsQuery.mockReturnValue({ data: [{ key: "plastik" }], isLoading: false, isError: false, refetch: vi.fn() });
  useBahanOptionsQuery.mockReturnValue({ data: [{ id: "b1" }] });
  useSaveHppTemplatesMutation.mockReturnValue({ mutateAsync: mockMutateAsync });
  useDeleteHppTemplateMutation.mockReturnValue({ mutateAsync: mockMutateAsync });
  useSaveHppConfigMutation.mockReturnValue({ mutateAsync: mockMutateAsync });
});

describe("useHppTemplates", () => {
  it("returns templates and loading=false", () => {
    const { result } = renderHook(() => useHppTemplates(), { wrapper });
    expect(result.current.templates).toEqual([{ id: "1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useHppTemplatesQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useHppTemplates(), { wrapper });
    expect(result.current.templates).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useHppConfig", () => {
  it("returns config object", () => {
    const { result } = renderHook(() => useHppConfig(), { wrapper });
    expect(result.current.plastik).toBe(1800);
  });
  it("returns {} when data undefined", () => {
    useHppConfigQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useHppConfig(), { wrapper });
    expect(result.current).toEqual({});
  });
});

describe("useHppConfigRows", () => {
  it("returns rows and loading", () => {
    const { result } = renderHook(() => useHppConfigRows(), { wrapper });
    expect(result.current.rows).toEqual([{ key: "plastik" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useHppConfigRowsQuery.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    const { result } = renderHook(() => useHppConfigRows(), { wrapper });
    expect(result.current.rows).toEqual([]);
  });
  it("returns error=true when query isError", () => {
    useHppConfigRowsQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { result } = renderHook(() => useHppConfigRows(), { wrapper });
    expect(result.current.error).toBe(true);
  });
  it("returns error=false when query succeeds", () => {
    const { result } = renderHook(() => useHppConfigRows(), { wrapper });
    expect(result.current.error).toBe(false);
  });
  it("exposes refetch from the underlying query", () => {
    const { result } = renderHook(() => useHppConfigRows(), { wrapper });
    expect(result.current.refetch).toBeInstanceOf(Function);
  });
});

describe("useBahanOptions", () => {
  it("returns options array", () => {
    const { result } = renderHook(() => useBahanOptions(), { wrapper });
    expect(result.current).toEqual([{ id: "b1" }]);
  });
  it("returns [] when data undefined", () => {
    useBahanOptionsQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useBahanOptions(), { wrapper });
    expect(result.current).toEqual([]);
  });
});

describe("useSaveHppTemplates", () => {
  it("calls mutateAsync", async () => {
    const { result } = renderHook(() => useSaveHppTemplates(), { wrapper });
    await result.current([{ kode_produk: "D-01" }], [], "a@b.com");
    expect(mockMutateAsync).toHaveBeenCalled();
  });
});

describe("useDeleteHppTemplate", () => {
  it("calls mutateAsync with target", async () => {
    const { result } = renderHook(() => useDeleteHppTemplate(), { wrapper });
    await result.current({ id: "t1" });
    expect(mockMutateAsync).toHaveBeenCalledWith({ id: "t1" });
  });
});

describe("useSaveHppConfig", () => {
  it("calls mutateAsync with key/nilai/email", async () => {
    const { result } = renderHook(() => useSaveHppConfig(), { wrapper });
    await result.current("plastik", 2000, "a@b.com");
    expect(useSaveHppConfigMutation).toHaveBeenCalled();
  });
});

describe("useHppTemplateFilter", () => {
  beforeEach(() => {
    useHppTemplateFilterStore.setState({
      applied: { ...DEFAULT_HPP_FILTER },
      draft: { ...DEFAULT_HPP_FILTER },
      isModalOpen: false,
    });
  });

  it("returns default applied filter dan hasActiveFilter false", () => {
    const { result } = renderHook(() => useHppTemplateFilter());
    expect(result.current.applied).toEqual(DEFAULT_HPP_FILTER);
    expect(result.current.hasActiveFilter).toBe(false);
  });

  it("openModal menyalin applied ke draft dan membuka modal", () => {
    const { result } = renderHook(() => useHppTemplateFilter());
    act(() => result.current.setDraft({ hppMin: "10000" }));
    act(() => result.current.applyDraft());
    act(() => result.current.openModal());
    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.draft.hppMin).toBe("10000");
  });

  it("applyDraft memindahkan draft ke applied dan menutup modal", () => {
    const { result } = renderHook(() => useHppTemplateFilter());
    act(() => result.current.openModal());
    act(() => result.current.setDraft({ sort: "hpp-tertinggi" }));
    act(() => result.current.applyDraft());
    expect(result.current.applied.sort).toBe("hpp-tertinggi");
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.hasActiveFilter).toBe(true);
  });

  it("closeModal membuang draft (reset ke applied) dan menutup modal", () => {
    const { result } = renderHook(() => useHppTemplateFilter());
    act(() => result.current.openModal());
    act(() => result.current.setDraft({ hppMax: "50000" }));
    act(() => result.current.closeModal());
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.draft.hppMax).toBe("");
  });

  it("resetAll mengembalikan semua state ke default", () => {
    const { result } = renderHook(() => useHppTemplateFilter());
    act(() => result.current.setDraft({ hppMin: "1000" }));
    act(() => result.current.applyDraft());
    act(() => result.current.resetAll());
    expect(result.current.applied).toEqual(DEFAULT_HPP_FILTER);
    expect(result.current.draft).toEqual(DEFAULT_HPP_FILTER);
    expect(result.current.hasActiveFilter).toBe(false);
  });
});
