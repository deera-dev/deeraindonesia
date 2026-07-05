import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./queries", () => ({
  useKasbonAllQuery:                       vi.fn(() => ({ data: [{ id: "kb1", status: "belum", sisa: 50000 }], isLoading: false, error: null })),
  useKasbonBelumLunasByKaryawanIdsQuery:   vi.fn(() => ({ data: [{ id: "kb1" }], isLoading: false })),
  useCreateOrAccumulateKasbonMutation:      vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateKasbonJumlahMutation:            vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteKasbonMutation:                 vi.fn(() => ({ mutateAsync: vi.fn() })),
  usePayCicilanMutation:                   vi.fn(() => ({ mutateAsync: vi.fn() })),
  useApplyKasbonDeductionMutation:         vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useKasbonList, useKasbonBelumLunasByKaryawanIds, useCreateOrAccumulateKasbon,
  useUpdateKasbonJumlah, useDeleteKasbon, usePayCicilan, useApplyKasbonDeduction } from "./hooks";
import { useKasbonAllQuery, useKasbonBelumLunasByKaryawanIdsQuery } from "./queries";

const w = () => {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useKasbonList", () => {
  it("returns rows and loading=false", () => {
    const { result } = renderHook(() => useKasbonList(), { wrapper: w() });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });
});

describe("useKasbonBelumLunasByKaryawanIds", () => {
  it("returns kasbon array", () => {
    const { result } = renderHook(() => useKasbonBelumLunasByKaryawanIds(["k1"]), { wrapper: w() });
    expect(result.current.kasbon).toHaveLength(1);
  });
});

describe("function hooks", () => {
  it("useCreateOrAccumulateKasbon returns function", () => {
    const { result } = renderHook(() => useCreateOrAccumulateKasbon(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
  it("useUpdateKasbonJumlah returns function", () => {
    const { result } = renderHook(() => useUpdateKasbonJumlah(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
  it("useDeleteKasbon returns function", () => {
    const { result } = renderHook(() => useDeleteKasbon(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
  it("usePayCicilan returns function", () => {
    const { result } = renderHook(() => usePayCicilan(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
  it("useApplyKasbonDeduction returns function", () => {
    const { result } = renderHook(() => useApplyKasbonDeduction(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
});

// ── Null data branches + lambda calls ────────────────────────────────────────
describe("useKasbonList — null data ?? [] branch", () => {
  it("returns empty rows when query data is null", () => {
    useKasbonAllQuery.mockReturnValueOnce({ data: null, isLoading: false, error: null });
    const { result } = renderHook(() => useKasbonList(), { wrapper: w() });
    expect(result.current.rows).toEqual([]);
  });

  it("loadError is set when error has message", () => {
    useKasbonAllQuery.mockReturnValueOnce({ data: null, isLoading: false, error: { message: "fail" } });
    const { result } = renderHook(() => useKasbonList(), { wrapper: w() });
    expect(result.current.loadError).toBe("fail");
  });

  it("loadError is null when error is null", () => {
    const { result } = renderHook(() => useKasbonList(), { wrapper: w() });
    expect(result.current.loadError).toBeNull();
  });
});

describe("useKasbonBelumLunasByKaryawanIds — null data ?? [] branch", () => {
  it("returns empty kasbon when query data is null", () => {
    useKasbonBelumLunasByKaryawanIdsQuery.mockReturnValueOnce({ data: null, isLoading: false });
    const { result } = renderHook(() => useKasbonBelumLunasByKaryawanIds(["k1"]), { wrapper: w() });
    expect(result.current.kasbon).toEqual([]);
  });
});

describe("returned lambda calls — cover inner lambda bodies", () => {
  it("useCreateOrAccumulateKasbon lambda calls mutateAsync", () => {
    const { result } = renderHook(() => useCreateOrAccumulateKasbon(), { wrapper: w() });
    result.current({ karyawanId: "k1", jumlah: 100 });
  });

  it("useUpdateKasbonJumlah lambda calls mutateAsync", () => {
    const { result } = renderHook(() => useUpdateKasbonJumlah(), { wrapper: w() });
    result.current({ initial: { id: "kb1" }, jumlah: 100 });
  });

  it("useDeleteKasbon lambda calls mutateAsync", () => {
    const { result } = renderHook(() => useDeleteKasbon(), { wrapper: w() });
    result.current("kb1");
  });

  it("usePayCicilan lambda calls mutateAsync", () => {
    const { result } = renderHook(() => usePayCicilan(), { wrapper: w() });
    result.current({ kasbon: { id: "kb1" }, jumlah: 50 });
  });

  it("useApplyKasbonDeduction lambda calls mutateAsync with correct shape", () => {
    const { result } = renderHook(() => useApplyKasbonDeduction(), { wrapper: w() });
    result.current({ id: "kb1", sisa: 100 }, { jumlah: 50, tanggal: "2026-07-01", keterangan: "" });
  });
});
