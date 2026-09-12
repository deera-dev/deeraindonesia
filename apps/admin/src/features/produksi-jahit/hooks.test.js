import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useJahitCardsQuery: vi.fn(),
  useDoneJahitCardsQuery: vi.fn(),
  useKaryawanJahitQuery: vi.fn(),
  useCreateJahitCardsForBatchMutation: vi.fn(),
  useAssignKaryawanMutation: vi.fn(),
  useMoveToReadyFinishingMutation: vi.fn(),
  useUnassignCardMutation: vi.fn(),
  useMoveBackToProgressMutation: vi.fn(),
  useMarkCardDoneMutation: vi.fn(),
}));

import {
  useJahitCards,
  useDoneJahitCards,
  useKaryawanJahit,
  useCreateJahitCardsForBatch,
  useAssignKaryawan,
  useMoveToReadyFinishing,
  useUnassignCard,
  useMoveBackToProgress,
  useMarkCardDone,
} from "./hooks";
import {
  useJahitCardsQuery,
  useDoneJahitCardsQuery,
  useKaryawanJahitQuery,
  useCreateJahitCardsForBatchMutation,
  useAssignKaryawanMutation,
  useMoveToReadyFinishingMutation,
  useUnassignCardMutation,
  useMoveBackToProgressMutation,
  useMarkCardDoneMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useJahitCardsQuery.mockReturnValue({ data: [{ id: "c1" }], isLoading: false });
  useDoneJahitCardsQuery.mockReturnValue({ data: [{ id: "c-done" }], isLoading: false });
  useKaryawanJahitQuery.mockReturnValue({ data: [{ id: "k1", nama: "Budi" }], isLoading: false });
  useCreateJahitCardsForBatchMutation.mockReturnValue({ mutateAsync: mockMutate });
  useAssignKaryawanMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useMoveToReadyFinishingMutation.mockReturnValue({ mutateAsync: mockMutate });
  useUnassignCardMutation.mockReturnValue({ mutateAsync: mockMutate });
  useMoveBackToProgressMutation.mockReturnValue({ mutateAsync: mockMutate });
  useMarkCardDoneMutation.mockReturnValue({ mutateAsync: mockMutate });
});

describe("useJahitCards", () => {
  it("returns cards & loading state, fallback [] saat data undefined", () => {
    const { result } = renderHook(() => useJahitCards(), { wrapper });
    expect(result.current.cards).toEqual([{ id: "c1" }]);
    expect(result.current.loading).toBe(false);

    useJahitCardsQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result: r2 } = renderHook(() => useJahitCards(), { wrapper });
    expect(r2.current.cards).toEqual([]);
    expect(r2.current.loading).toBe(true);
  });
});

describe("useKaryawanJahit", () => {
  it("returns karyawanList & loading state", () => {
    const { result } = renderHook(() => useKaryawanJahit(), { wrapper });
    expect(result.current.karyawanList).toEqual([{ id: "k1", nama: "Budi" }]);
    expect(result.current.loading).toBe(false);
  });
});

describe("useCreateJahitCardsForBatch", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useCreateJahitCardsForBatch(), { wrapper });
    await result.current({ batchId: "b1" });
    expect(mockMutate).toHaveBeenCalledWith({ batchId: "b1" });
  });
});

describe("useAssignKaryawan", () => {
  it("expose assign() dan assigning flag", async () => {
    const { result } = renderHook(() => useAssignKaryawan(), { wrapper });
    expect(result.current.assigning).toBe(false);
    await result.current.assign({ cardId: "c1", karyawanId: "k1" });
    expect(mockMutate).toHaveBeenCalledWith({ cardId: "c1", karyawanId: "k1" });
  });
});

describe("useMoveToReadyFinishing", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useMoveToReadyFinishing(), { wrapper });
    await result.current({ cardId: "c1" });
    expect(mockMutate).toHaveBeenCalledWith({ cardId: "c1" });
  });
});

describe("useUnassignCard", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useUnassignCard(), { wrapper });
    await result.current({ cardId: "c1" });
    expect(mockMutate).toHaveBeenCalledWith({ cardId: "c1" });
  });
});

describe("useMoveBackToProgress", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useMoveBackToProgress(), { wrapper });
    await result.current({ cardId: "c1" });
    expect(mockMutate).toHaveBeenCalledWith({ cardId: "c1" });
  });
});

describe("useDoneJahitCards", () => {
  it("returns cards & loading state, fallback [] saat data undefined", () => {
    const { result } = renderHook(() => useDoneJahitCards({}, true), { wrapper });
    expect(result.current.cards).toEqual([{ id: "c-done" }]);
    expect(result.current.loading).toBe(false);

    useDoneJahitCardsQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result: r2 } = renderHook(() => useDoneJahitCards({}, true), { wrapper });
    expect(r2.current.cards).toEqual([]);
    expect(r2.current.loading).toBe(true);
  });
});

describe("useMarkCardDone", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useMarkCardDone(), { wrapper });
    await result.current({ cardId: "c1" });
    expect(mockMutate).toHaveBeenCalledWith({ cardId: "c1" });
  });
});
