import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useSampelsQuery: vi.fn(),
  useUpdateSampelMutation: vi.fn(),
  useCreateSampelsMutation: vi.fn(),
  useCreatePlanningMutation: vi.fn(),
  useMarkSampelDibuatMutation: vi.fn(),
  useSaveBatchDecisionsMutation: vi.fn(),
  useDeleteSampelMutation: vi.fn(),
}));

import {
  useSampels, useUpdateSampel, useCreateSampels, useCreatePlanning, useMarkSampelDibuat,
  useSaveBatchDecisions, useDeleteSampel,
} from "./hooks";
import {
  useSampelsQuery, useUpdateSampelMutation, useCreateSampelsMutation,
  useCreatePlanningMutation, useMarkSampelDibuatMutation,
  useSaveBatchDecisionsMutation, useDeleteSampelMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useSampelsQuery.mockReturnValue({ data: [{ id: "s1" }], isLoading: false });
  useUpdateSampelMutation.mockReturnValue({ mutateAsync: mockMutate });
  useCreateSampelsMutation.mockReturnValue({ mutateAsync: mockMutate });
  useCreatePlanningMutation.mockReturnValue({ mutateAsync: mockMutate });
  useMarkSampelDibuatMutation.mockReturnValue({ mutateAsync: mockMutate });
  useSaveBatchDecisionsMutation.mockReturnValue({ mutateAsync: mockMutate });
  useDeleteSampelMutation.mockReturnValue({ mutateAsync: mockMutate });
});

describe("useSampels", () => {
  it("returns sampels and loading=false", () => {
    const { result } = renderHook(() => useSampels(), { wrapper });
    expect(result.current.sampels).toEqual([{ id: "s1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useSampelsQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useSampels(), { wrapper });
    expect(result.current.sampels).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useUpdateSampel", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useUpdateSampel(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync with params", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useUpdateSampelMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useUpdateSampel(), { wrapper });
    await result.current({ id: "s1", nomor: "SPL-001", nama: "X", tanggal: "2024-01-01", foto: [] });
    expect(customMutate).toHaveBeenCalled();
  });
});

describe("useCreateSampels", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useCreateSampels(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
});

describe("useCreatePlanning", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useCreatePlanning(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync dengan entry/bahanFotoUrl/modelFotoUrls/userEmail/userName", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useCreatePlanningMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useCreatePlanning(), { wrapper });
    await result.current({ nama: "X", tanggal: "2026-08-01" }, "bahan.jpg", ["m1.jpg"], "a@b.com", "A");
    expect(customMutate).toHaveBeenCalledWith({
      entry: { nama: "X", tanggal: "2026-08-01" },
      bahanFotoUrl: "bahan.jpg",
      modelFotoUrls: ["m1.jpg"],
      userEmail: "a@b.com",
      userName: "A",
    });
  });
});

describe("useMarkSampelDibuat", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useMarkSampelDibuat(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync dengan id/nomor/nama/foto", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useMarkSampelDibuatMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useMarkSampelDibuat(), { wrapper });
    await result.current({ id: "s1", nomor: "SPL-001", nama: "X", foto: ["jadi.jpg"] });
    expect(customMutate).toHaveBeenCalledWith({ id: "s1", nomor: "SPL-001", nama: "X", foto: ["jadi.jpg"] });
  });
});

describe("useSaveBatchDecisions", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useSaveBatchDecisions(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
});

describe("useDeleteSampel", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useDeleteSampel(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync with id", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useDeleteSampelMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useDeleteSampel(), { wrapper });
    await result.current("s1");
    expect(customMutate).toHaveBeenCalledWith("s1");
  });
});
