import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useJahitCardsQuery: vi.fn(),
  useDoneJahitCardsQuery: vi.fn(),
  useKaryawanJahitQuery: vi.fn(),
  useCreateJahitCardsForBatchMutation: vi.fn(),
  useLookupJahitCardMutation: vi.fn(),
  useReceiveCardMutation: vi.fn(),
  useUnassignCardMutation: vi.fn(),
  useMarkCardDoneMutation: vi.fn(),
  useMarkCardsDoneMutation: vi.fn(),
}));

import {
  useJahitCards,
  useDoneJahitCards,
  useKaryawanJahit,
  useCreateJahitCardsForBatch,
  useLookupJahitCard,
  useReceiveCard,
  useUnassignCard,
  useMarkCardDone,
  useMarkCardsDone,
} from "./hooks";
import {
  useJahitCardsQuery,
  useDoneJahitCardsQuery,
  useKaryawanJahitQuery,
  useCreateJahitCardsForBatchMutation,
  useLookupJahitCardMutation,
  useReceiveCardMutation,
  useUnassignCardMutation,
  useMarkCardDoneMutation,
  useMarkCardsDoneMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useJahitCardsQuery.mockReturnValue({ data: [{ id: "c1" }], isLoading: false });
  useDoneJahitCardsQuery.mockReturnValue({ data: [{ id: "c-done" }], isLoading: false });
  useKaryawanJahitQuery.mockReturnValue({ data: [{ id: "k1", nama: "Budi" }], isLoading: false });
  useCreateJahitCardsForBatchMutation.mockReturnValue({ mutateAsync: mockMutate });
  useLookupJahitCardMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useReceiveCardMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
  useUnassignCardMutation.mockReturnValue({ mutateAsync: mockMutate });
  useMarkCardDoneMutation.mockReturnValue({ mutateAsync: mockMutate });
  useMarkCardsDoneMutation.mockReturnValue({ mutateAsync: mockMutate, isPending: false });
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

describe("useLookupJahitCard", () => {
  it("expose lookup() dan looking flag", async () => {
    const { result } = renderHook(() => useLookupJahitCard(), { wrapper });
    expect(result.current.looking).toBe(false);
    await result.current.lookup("c1");
    expect(mockMutate).toHaveBeenCalledWith("c1");
  });
});

describe("useReceiveCard", () => {
  it("expose receive() dan receiving flag", async () => {
    const { result } = renderHook(() => useReceiveCard(), { wrapper });
    expect(result.current.receiving).toBe(false);
    await result.current.receive({ cardId: "c1", karyawanId: "k1", qty: 5 });
    expect(mockMutate).toHaveBeenCalledWith({ cardId: "c1", karyawanId: "k1", qty: 5 });
  });
});

describe("useUnassignCard", () => {
  it("meneruskan params ke mutateAsync", async () => {
    const { result } = renderHook(() => useUnassignCard(), { wrapper });
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

describe("useMarkCardsDone", () => {
  it("meneruskan params ke mutateAsync + expose marking", async () => {
    const { result } = renderHook(() => useMarkCardsDone(), { wrapper });
    await result.current.markCardsDone({ cardIds: ["c1", "c2"] });
    expect(mockMutate).toHaveBeenCalledWith({ cardIds: ["c1", "c2"] });
    expect(result.current.marking).toBe(false);
  });
});
