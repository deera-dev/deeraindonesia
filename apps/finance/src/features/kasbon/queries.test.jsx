import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./api", () => ({
  fetchKasbonAll: vi.fn().mockResolvedValue([{ id: "kb1" }]),
  getKasbonBelumLunasByKaryawanIds: vi.fn().mockResolvedValue([{ id: "kb1" }]),
  createOrAccumulateKasbon: vi.fn().mockResolvedValue({ accumulated: false }),
  updateKasbonJumlah: vi.fn().mockResolvedValue({ newSisa: 0, newStatus: "lunas" }),
  deleteKasbon: vi.fn().mockResolvedValue(undefined),
  payCicilan: vi.fn().mockResolvedValue({ newSisa: 0, newStatus: "lunas" }),
  applyKasbonDeductionFromGajian: vi.fn().mockResolvedValue(undefined),
}));

import {
  kasbonKeys,
  useKasbonAllQuery,
  useKasbonBelumLunasByKaryawanIdsQuery,
  useCreateOrAccumulateKasbonMutation,
  useUpdateKasbonJumlahMutation,
  useDeleteKasbonMutation,
  usePayCicilanMutation,
  useApplyKasbonDeductionMutation,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("kasbonKeys", () => {
  it("all is an array", () => {
    expect(Array.isArray(kasbonKeys.all)).toBe(true);
  });
  it("belumLunasByIds sorts ids", () => {
    const a = kasbonKeys.belumLunasByIds(["z", "a"]);
    const b = kasbonKeys.belumLunasByIds(["a", "z"]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("belumLunasByIds handles null ids", () => {
    expect(kasbonKeys.belumLunasByIds(null)).toEqual(["kasbon", "belum-lunas", []]);
  });
});

describe("useKasbonAllQuery", () => {
  it("fetches all kasbon", async () => {
    const { result } = renderHook(() => useKasbonAllQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useKasbonBelumLunasByKaryawanIdsQuery", () => {
  it("is disabled when ids is empty", () => {
    const { result } = renderHook(() => useKasbonBelumLunasByKaryawanIdsQuery([]), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("fetches when ids provided", async () => {
    const { result } = renderHook(() => useKasbonBelumLunasByKaryawanIdsQuery(["k1"]), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("mutation hooks — expose mutate", () => {
  it("useCreateOrAccumulateKasbonMutation exposes mutate", () => {
    const { result } = renderHook(() => useCreateOrAccumulateKasbonMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useUpdateKasbonJumlahMutation exposes mutate", () => {
    const { result } = renderHook(() => useUpdateKasbonJumlahMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteKasbonMutation exposes mutate", () => {
    const { result } = renderHook(() => useDeleteKasbonMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("usePayCicilanMutation exposes mutate", () => {
    const { result } = renderHook(() => usePayCicilanMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useApplyKasbonDeductionMutation exposes mutate", () => {
    const { result } = renderHook(() => useApplyKasbonDeductionMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("mutation mutateAsync — mutationFn and onSuccess lambdas", () => {
  it("useCreateOrAccumulateKasbonMutation runs mutationFn and onSuccess", async () => {
    const { result } = renderHook(() => useCreateOrAccumulateKasbonMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ karyawanId: "k1", jumlah: 100, existingRows: [] });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateKasbonJumlahMutation runs mutationFn and onSuccess", async () => {
    const { result } = renderHook(() => useUpdateKasbonJumlahMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ initial: { id: "kb1", jumlah: 100, sisa: 50 }, jumlah: 100 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteKasbonMutation runs mutationFn and onSuccess", async () => {
    const { result } = renderHook(() => useDeleteKasbonMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync("kb1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("usePayCicilanMutation runs mutationFn and onSuccess", async () => {
    const { result } = renderHook(() => usePayCicilanMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ kasbon: { id: "kb1", sisa: 100, cicilan: [] }, jumlah: 50, tanggal: "2026-07-01" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useApplyKasbonDeductionMutation runs mutationFn and onSuccess", async () => {
    const { result } = renderHook(() => useApplyKasbonDeductionMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ kasbonRow: { id: "kb1", sisa: 100, cicilan: [] }, jumlah: 50, tanggal: "2026-07-01", keterangan: "" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
