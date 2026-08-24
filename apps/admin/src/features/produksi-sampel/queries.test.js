import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchSampels: vi.fn().mockResolvedValue([{ id: "s1" }]),
  updateSampel: vi.fn().mockResolvedValue(undefined),
  createSampels: vi.fn().mockResolvedValue([{ nomor: "SPL-001" }]),
  createPlanning: vi.fn().mockResolvedValue({ nomor: "SPL-002" }),
  reorderPlanning: vi.fn().mockResolvedValue(undefined),
  markSampelDibuat: vi.fn().mockResolvedValue(undefined),
  saveBatchDecisions: vi.fn().mockResolvedValue([]),
  deleteSampel: vi.fn().mockResolvedValue(undefined),
}));

import { createPlanning, reorderPlanning } from "./api";
import {
  produksiSampelKeys,
  useSampelsQuery, useUpdateSampelMutation, useCreateSampelsMutation,
  useCreatePlanningMutation, useReorderPlanningMutation, useMarkSampelDibuatMutation,
  useSaveBatchDecisionsMutation, useDeleteSampelMutation,
} from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("produksiSampelKeys", () => {
  it("has all key", () => {
    expect(produksiSampelKeys.all).toEqual(["produksi-sampel"]);
  });
});

describe("useSampelsQuery", () => {
  it("returns sampel data", async () => {
    const { result } = renderHook(() => useSampelsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "s1" }]);
  });
});

describe("useUpdateSampelMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useUpdateSampelMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useCreateSampelsMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useCreateSampelsMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useCreatePlanningMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useCreatePlanningMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });

  it("meneruskan bahanItems & urutan ke createPlanning() dgn urutan posisional yang benar", async () => {
    const { result } = renderHook(() => useCreatePlanningMutation(), { wrapper });
    const entry = { nama: "X", tanggal: "2026-08-01" };
    const bahanItems = [{ nama_bahan: "Wolfis" }];
    await result.current.mutateAsync({
      entry,
      bahanFotoUrl: "url-bahan",
      modelFotoUrls: ["url-model"],
      bahanItems,
      urutan: 2,
      userEmail: "a@b.com",
      userName: "A",
    });
    expect(createPlanning).toHaveBeenCalledWith(
      entry,
      "url-bahan",
      ["url-model"],
      bahanItems,
      2,
      { userEmail: "a@b.com", userName: "A" },
    );
  });
});

describe("useReorderPlanningMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useReorderPlanningMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });

  it("meneruskan updates ke reorderPlanning()", async () => {
    const { result } = renderHook(() => useReorderPlanningMutation(), { wrapper });
    const updates = [{ id: "s1", urutan: 0 }, { id: "s2", urutan: 1 }];
    await result.current.mutateAsync(updates);
    expect(reorderPlanning).toHaveBeenCalledWith(updates);
  });
});

describe("useMarkSampelDibuatMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useMarkSampelDibuatMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useSaveBatchDecisionsMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useSaveBatchDecisionsMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useDeleteSampelMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useDeleteSampelMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});
