import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchSampels: vi.fn().mockResolvedValue([{ id: "s1" }]),
  updateSampel: vi.fn().mockResolvedValue(undefined),
  createSampels: vi.fn().mockResolvedValue([{ nomor: "SPL-001" }]),
  createPlanning: vi.fn().mockResolvedValue({ nomor: "SPL-002" }),
  markSampelDibuat: vi.fn().mockResolvedValue(undefined),
  saveBatchDecisions: vi.fn().mockResolvedValue([]),
  deleteSampel: vi.fn().mockResolvedValue(undefined),
}));

import {
  produksiSampelKeys,
  useSampelsQuery, useUpdateSampelMutation, useCreateSampelsMutation,
  useCreatePlanningMutation, useMarkSampelDibuatMutation,
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
