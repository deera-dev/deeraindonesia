import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useSampelsQuery: vi.fn(),
  useUpdateSampelMutation: vi.fn(),
  useCreateSampelsMutation: vi.fn(),
  useCreatePlanningMutation: vi.fn(),
  useReorderPlanningMutation: vi.fn(),
  useMarkSampelDibuatMutation: vi.fn(),
  useSaveBatchDecisionsMutation: vi.fn(),
  useDeleteSampelMutation: vi.fn(),
  useTogglePinnedMutation: vi.fn(),
  useCommentsQuery: vi.fn(),
  useAddCommentMutation: vi.fn(),
  useDeleteCommentMutation: vi.fn(),
  useLogWorkOrderMutation: vi.fn(),
}));

import {
  useSampels, useUpdateSampel, useCreateSampels, useCreatePlanning, useReorderPlanning,
  useMarkSampelDibuat, useSaveBatchDecisions, useDeleteSampel,
  useTogglePinned, useComments, useAddComment, useDeleteComment, useLogWorkOrder,
} from "./hooks";
import {
  useSampelsQuery, useUpdateSampelMutation, useCreateSampelsMutation,
  useCreatePlanningMutation, useReorderPlanningMutation, useMarkSampelDibuatMutation,
  useSaveBatchDecisionsMutation, useDeleteSampelMutation,
  useTogglePinnedMutation, useCommentsQuery, useAddCommentMutation, useDeleteCommentMutation,
  useLogWorkOrderMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useSampelsQuery.mockReturnValue({ data: [{ id: "s1" }], isLoading: false });
  useUpdateSampelMutation.mockReturnValue({ mutateAsync: mockMutate });
  useCreateSampelsMutation.mockReturnValue({ mutateAsync: mockMutate });
  useCreatePlanningMutation.mockReturnValue({ mutateAsync: mockMutate });
  useReorderPlanningMutation.mockReturnValue({ mutateAsync: mockMutate });
  useMarkSampelDibuatMutation.mockReturnValue({ mutateAsync: mockMutate });
  useSaveBatchDecisionsMutation.mockReturnValue({ mutateAsync: mockMutate });
  useDeleteSampelMutation.mockReturnValue({ mutateAsync: mockMutate });
  useTogglePinnedMutation.mockReturnValue({ mutateAsync: mockMutate });
  useCommentsQuery.mockReturnValue({ data: [{ id: "c1" }], isLoading: false });
  useAddCommentMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useDeleteCommentMutation.mockReturnValue({ mutateAsync: mockMutate });
  useLogWorkOrderMutation.mockReturnValue({ mutateAsync: mockMutate });
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
  it("calls mutateAsync dengan entry/bahanFotoUrl/modelFotoUrls/bahanItems/urutan/userEmail/userName", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useCreatePlanningMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useCreatePlanning(), { wrapper });
    const bahanItems = [{ nama_bahan: "Wolfis" }];
    await result.current(
      { nama: "X", tanggal: "2026-08-01" },
      "bahan.jpg",
      ["m1.jpg"],
      bahanItems,
      2,
      "a@b.com",
      "A",
    );
    expect(customMutate).toHaveBeenCalledWith({
      entry: { nama: "X", tanggal: "2026-08-01" },
      bahanFotoUrl: "bahan.jpg",
      modelFotoUrls: ["m1.jpg"],
      bahanItems,
      urutan: 2,
      userEmail: "a@b.com",
      userName: "A",
    });
  });
});

describe("useReorderPlanning", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useReorderPlanning(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync with updates array", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useReorderPlanningMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useReorderPlanning(), { wrapper });
    const updates = [{ id: "s1", urutan: 0 }];
    await result.current(updates);
    expect(customMutate).toHaveBeenCalledWith(updates);
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

describe("useTogglePinned", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useTogglePinned(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync with id & pinned", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useTogglePinnedMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useTogglePinned(), { wrapper });
    await result.current("s1", true);
    expect(customMutate).toHaveBeenCalledWith({ id: "s1", pinned: true });
  });
});

describe("useComments", () => {
  it("returns comments and loading=false", () => {
    const { result } = renderHook(() => useComments("s1"), { wrapper });
    expect(result.current.comments).toEqual([{ id: "c1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useCommentsQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useComments("s1"), { wrapper });
    expect(result.current.comments).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useAddComment", () => {
  it("returns addComment function and adding flag", () => {
    const { result } = renderHook(() => useAddComment(), { wrapper });
    expect(typeof result.current.addComment).toBe("function");
    expect(result.current.adding).toBe(false);
  });
  it("calls mutateAsync with params", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useAddCommentMutation.mockReturnValue({ mutateAsync: customMutate, isPending: false });
    const { result } = renderHook(() => useAddComment(), { wrapper });
    const params = { sampelId: "s1", text: "halo" };
    await result.current.addComment(params);
    expect(customMutate).toHaveBeenCalledWith(params);
  });
});

describe("useDeleteComment", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useDeleteComment(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync with id & sampelId", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useDeleteCommentMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useDeleteComment(), { wrapper });
    await result.current("c1", "s1");
    expect(customMutate).toHaveBeenCalledWith({ id: "c1", sampelId: "s1" });
  });
});

describe("useLogWorkOrder (permintaan Denny 2026-09: Work Order tukang potong)", () => {
  it("returns a callable function", () => {
    const { result } = renderHook(() => useLogWorkOrder(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
  it("calls mutateAsync with params", async () => {
    const customMutate = vi.fn().mockResolvedValue(undefined);
    useLogWorkOrderMutation.mockReturnValue({ mutateAsync: customMutate });
    const { result } = renderHook(() => useLogWorkOrder(), { wrapper });
    const params = { sampel: { nomor: "SPL-001" }, sizes: ["Midi"], catatanPenting: "" };
    await result.current(params);
    expect(customMutate).toHaveBeenCalledWith(params);
  });
});
