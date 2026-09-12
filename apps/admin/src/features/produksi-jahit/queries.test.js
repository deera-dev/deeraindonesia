import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchJahitCards: vi.fn().mockResolvedValue([{ id: "c1" }]),
  fetchDoneJahitCards: vi.fn().mockResolvedValue([{ id: "c-done" }]),
  fetchKaryawanJahit: vi.fn().mockResolvedValue([{ id: "k1", nama: "Budi" }]),
  createJahitCardsForBatch: vi.fn().mockResolvedValue([{ id: "c2" }]),
  assignKaryawan: vi.fn().mockResolvedValue(undefined),
  moveToReadyFinishing: vi.fn().mockResolvedValue(undefined),
  unassignCard: vi.fn().mockResolvedValue(undefined),
  moveBackToProgress: vi.fn().mockResolvedValue(undefined),
  markCardDone: vi.fn().mockResolvedValue(undefined),
}));

import { fetchDoneJahitCards } from "./api";
import {
  jahitCardsKeys,
  karyawanJahitKeys,
  doneJahitCardsKeys,
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
beforeEach(() => vi.clearAllMocks());

describe("query keys", () => {
  it("jahitCardsKeys.all", () => {
    expect(jahitCardsKeys.all).toEqual(["jahit-cards"]);
  });
  it("karyawanJahitKeys.all", () => {
    expect(karyawanJahitKeys.all).toEqual(["karyawan-jahit"]);
  });
  it("doneJahitCardsKeys.filtered ikutkan filter di key", () => {
    const filter = { dateFrom: "2026-09-01" };
    expect(doneJahitCardsKeys.filtered(filter)).toEqual(["jahit-cards-done", filter]);
  });
});

describe("useJahitCardsQuery", () => {
  it("returns kartu jahit", async () => {
    const { result } = renderHook(() => useJahitCardsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "c1" }]);
  });
});

describe("useKaryawanJahitQuery", () => {
  it("returns daftar karyawan jahit", async () => {
    const { result } = renderHook(() => useKaryawanJahitQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "k1", nama: "Budi" }]);
  });
});

describe("useDoneJahitCardsQuery", () => {
  it("returns arsip kartu done saat enabled=true", async () => {
    const { result } = renderHook(() => useDoneJahitCardsQuery({ search: "D-01" }, true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "c-done" }]);
    expect(fetchDoneJahitCards).toHaveBeenCalledWith({ search: "D-01" });
  });

  it("tidak fetch sama sekali saat enabled=false", () => {
    const { result } = renderHook(() => useDoneJahitCardsQuery({}, false), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchDoneJahitCards).not.toHaveBeenCalled();
  });
});

describe.each([
  ["useCreateJahitCardsForBatchMutation", useCreateJahitCardsForBatchMutation],
  ["useAssignKaryawanMutation", useAssignKaryawanMutation],
  ["useMoveToReadyFinishingMutation", useMoveToReadyFinishingMutation],
  ["useUnassignCardMutation", useUnassignCardMutation],
  ["useMoveBackToProgressMutation", useMoveBackToProgressMutation],
  ["useMarkCardDoneMutation", useMarkCardDoneMutation],
])("%s", (_name, useHook) => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useHook(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});
