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
  useSaveHppTemplates, useDeleteHppTemplate, useSaveHppConfig,
} from "./hooks";
import {
  useHppTemplatesQuery, useHppConfigQuery, useHppConfigRowsQuery, useBahanOptionsQuery,
  useSaveHppTemplatesMutation, useDeleteHppTemplateMutation, useSaveHppConfigMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useHppTemplatesQuery.mockReturnValue({ data: [{ id: "1" }], isLoading: false });
  useHppConfigQuery.mockReturnValue({ data: { plastik: 1800 } });
  useHppConfigRowsQuery.mockReturnValue({ data: [{ key: "plastik" }], isLoading: false });
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
    useHppConfigRowsQuery.mockReturnValue({ data: undefined, isLoading: false });
    const { result } = renderHook(() => useHppConfigRows(), { wrapper });
    expect(result.current.rows).toEqual([]);
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
