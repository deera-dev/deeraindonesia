import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./api", () => ({
  fetchGajianList:         vi.fn().mockResolvedValue([{ id: "g1" }]),
  fetchGajianDetail:       vi.fn().mockResolvedValue({ id: "g1" }),
  createGajianPeriode:     vi.fn().mockResolvedValue("g2"),
  deleteGajianPeriode:     vi.fn().mockResolvedValue(undefined),
  saveGajianRequest:       vi.fn().mockResolvedValue(undefined),
  finalizeGajian:          vi.fn().mockResolvedValue(undefined),
  fetchGajianTotals:       vi.fn().mockResolvedValue({ potong: 0, jahit: 0, finishing: 0, qa: 0, kreatif: 0, cmt: 0, gaji: 0 }),
  fetchKaryawanIdsInGajian:vi.fn().mockResolvedValue(["k1"]),
  fetchPotong:             vi.fn().mockResolvedValue([]),
  savePotong:              vi.fn().mockResolvedValue(undefined),
  deletePotong:            vi.fn().mockResolvedValue(undefined),
  fetchJahit:              vi.fn().mockResolvedValue([]),
  saveJahit:               vi.fn().mockResolvedValue(undefined),
  deleteJahit:             vi.fn().mockResolvedValue(undefined),
  fetchFinishing:          vi.fn().mockResolvedValue(null),
  saveFinishing:           vi.fn().mockResolvedValue(undefined),
  deleteFinishing:         vi.fn().mockResolvedValue(undefined),
  fetchQC:                 vi.fn().mockResolvedValue([]),
  saveQC:                  vi.fn().mockResolvedValue(undefined),
  deleteQC:                vi.fn().mockResolvedValue(undefined),
  fetchKreatif:            vi.fn().mockResolvedValue([]),
  saveKreatif:             vi.fn().mockResolvedValue(undefined),
  deleteKreatif:           vi.fn().mockResolvedValue(undefined),
  fetchCmt:                vi.fn().mockResolvedValue([]),
  saveCmt:                 vi.fn().mockResolvedValue(undefined),
  deleteCmt:               vi.fn().mockResolvedValue(undefined),
  fetchProdukList:         vi.fn().mockResolvedValue([]),
  fetchPotongForRincian:   vi.fn().mockResolvedValue([]),
  fetchJahitForRincian:    vi.fn().mockResolvedValue([]),
  fetchQCForRincian:       vi.fn().mockResolvedValue([]),
  fetchKreatifForRincian:  vi.fn().mockResolvedValue([]),
}));

import {
  gajianKeys,
  useGajianListQuery, useGajianDetailQuery,
  useCreateGajianPeriodeMutation, useDeleteGajianPeriodeMutation,
  useSaveGajianRequestMutation, useFinalizeGajianMutation,
  useGajianTotalsQuery, useKaryawanIdsInGajianQuery,
  usePotongQuery, useSavePotongMutation, useDeletePotongMutation,
  useJahitQuery, useSaveJahitMutation, useDeleteJahitMutation,
  useFinishingQuery, useSaveFinishingMutation, useDeleteFinishingMutation,
  useQCQuery, useSaveQCMutation, useDeleteQCMutation,
  useKreatifQuery, useSaveKreatifMutation, useDeleteKreatifMutation,
  useCmtQuery, useSaveCmtMutation, useDeleteCmtMutation,
  usePotongForRincianQuery, useJahitForRincianQuery,
  useQCForRincianQuery, useKreatifForRincianQuery,
  useProdukListQuery,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("gajianKeys", () => {
  it("all base keys are arrays", () => {
    expect(Array.isArray(gajianKeys.all)).toBe(true);
    expect(Array.isArray(gajianKeys.list())).toBe(true);
    expect(Array.isArray(gajianKeys.detail("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.potong("g1"))).toBe(true);
  });
  it("all team and rincian keys are arrays", () => {
    expect(Array.isArray(gajianKeys.totals("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.karyawanIds("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.jahit("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.finishing("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.qc("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.kreatif("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.cmt("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.produk())).toBe(true);
    expect(Array.isArray(gajianKeys.rincianPotong("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.rincianJahit("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.rincianQC("g1"))).toBe(true);
    expect(Array.isArray(gajianKeys.rincianKreatif("g1"))).toBe(true);
  });
});

describe("useGajianListQuery", () => {
  it("fetches list", async () => {
    const { result } = renderHook(() => useGajianListQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useGajianDetailQuery", () => {
  it("fetches detail when id provided", async () => {
    const { result } = renderHook(() => useGajianDetailQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.id).toBe("g1");
  });
  it("disabled when id falsy", () => {
    const { result } = renderHook(() => useGajianDetailQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("mutations expose mutate", () => {
  it("useCreateGajianPeriodeMutation", () => {
    const { result } = renderHook(() => useCreateGajianPeriodeMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteGajianPeriodeMutation", () => {
    const { result } = renderHook(() => useDeleteGajianPeriodeMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useSaveGajianRequestMutation", () => {
    const { result } = renderHook(() => useSaveGajianRequestMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useFinalizeGajianMutation", () => {
    const { result } = renderHook(() => useFinalizeGajianMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useSavePotongMutation", () => {
    const { result } = renderHook(() => useSavePotongMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeletePotongMutation", () => {
    const { result } = renderHook(() => useDeletePotongMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("useGajianTotalsQuery", () => {
  it("fetches totals when id provided", async () => {
    const { result } = renderHook(() => useGajianTotalsQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(typeof result.current.data.gaji).toBe("number");
  });
});

describe("useKaryawanIdsInGajianQuery", () => {
  it("fetches ids when id provided", async () => {
    const { result } = renderHook(() => useKaryawanIdsInGajianQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
  it("disabled when id falsy", () => {
    const { result } = renderHook(() => useKaryawanIdsInGajianQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePotongQuery", () => {
  it("disabled when gajianId falsy", () => {
    const { result } = renderHook(() => usePotongQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("fetches when gajianId provided", async () => {
    const { result } = renderHook(() => usePotongQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useProdukListQuery", () => {
  it("fetches produk list", async () => {
    const { result } = renderHook(() => useProdukListQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("Tim Jahit queries", () => {
  it("useJahitQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useJahitQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useJahitQuery disabled when falsy", () => {
    const { result } = renderHook(() => useJahitQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useSaveJahitMutation exposes mutate", () => {
    const { result } = renderHook(() => useSaveJahitMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteJahitMutation exposes mutate", () => {
    const { result } = renderHook(() => useDeleteJahitMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("Tim Finishing queries", () => {
  it("useFinishingQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useFinishingQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useFinishingQuery disabled when falsy", () => {
    const { result } = renderHook(() => useFinishingQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useSaveFinishingMutation exposes mutate", () => {
    const { result } = renderHook(() => useSaveFinishingMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteFinishingMutation exposes mutate", () => {
    const { result } = renderHook(() => useDeleteFinishingMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("Tim QC queries", () => {
  it("useQCQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useQCQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useQCQuery disabled when falsy", () => {
    const { result } = renderHook(() => useQCQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useSaveQCMutation exposes mutate", () => {
    const { result } = renderHook(() => useSaveQCMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteQCMutation exposes mutate", () => {
    const { result } = renderHook(() => useDeleteQCMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("Tim Kreatif queries", () => {
  it("useKreatifQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useKreatifQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useKreatifQuery disabled when falsy", () => {
    const { result } = renderHook(() => useKreatifQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useSaveKreatifMutation exposes mutate", () => {
    const { result } = renderHook(() => useSaveKreatifMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteKreatifMutation exposes mutate", () => {
    const { result } = renderHook(() => useDeleteKreatifMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("CMT Luar queries", () => {
  it("useCmtQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useCmtQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useCmtQuery disabled when falsy", () => {
    const { result } = renderHook(() => useCmtQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useSaveCmtMutation exposes mutate", () => {
    const { result } = renderHook(() => useSaveCmtMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("useDeleteCmtMutation exposes mutate", () => {
    const { result } = renderHook(() => useDeleteCmtMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

// Fire mutations to cover mutationFn/onSuccess arrow bodies + invalidateGajian
describe("mutations fire and cover callbacks", () => {
  it("useCreateGajianPeriodeMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useCreateGajianPeriodeMutation(), { wrapper: wrapper() });
    result.current.mutate("2026-07-05");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeleteGajianPeriodeMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeleteGajianPeriodeMutation(), { wrapper: wrapper() });
    result.current.mutate("g1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSaveGajianRequestMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSaveGajianRequestMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1", payload: {} });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useFinalizeGajianMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useFinalizeGajianMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1", payload: {} });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSavePotongMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSavePotongMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1", rows: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeletePotongMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeletePotongMutation(), { wrapper: wrapper() });
    result.current.mutate("row1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSaveJahitMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSaveJahitMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1", rows: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeleteJahitMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeleteJahitMutation(), { wrapper: wrapper() });
    result.current.mutate("row1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSaveFinishingMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSaveFinishingMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeleteFinishingMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeleteFinishingMutation(), { wrapper: wrapper() });
    result.current.mutate("row1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSaveQCMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSaveQCMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1", rows: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeleteQCMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeleteQCMutation(), { wrapper: wrapper() });
    result.current.mutate("row1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSaveKreatifMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSaveKreatifMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1", rows: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeleteKreatifMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeleteKreatifMutation(), { wrapper: wrapper() });
    result.current.mutate("row1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useSaveCmtMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useSaveCmtMutation(), { wrapper: wrapper() });
    result.current.mutate({ gajianId: "g1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useDeleteCmtMutation fires mutationFn + onSuccess", async () => {
    const { result } = renderHook(() => useDeleteCmtMutation(), { wrapper: wrapper() });
    result.current.mutate("row1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("Rincian queries", () => {
  it("usePotongForRincianQuery fetches when id provided", async () => {
    const { result } = renderHook(() => usePotongForRincianQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("usePotongForRincianQuery disabled when falsy", () => {
    const { result } = renderHook(() => usePotongForRincianQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useJahitForRincianQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useJahitForRincianQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useJahitForRincianQuery disabled when falsy", () => {
    const { result } = renderHook(() => useJahitForRincianQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
  it("useQCForRincianQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useQCForRincianQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it("useKreatifForRincianQuery fetches when id provided", async () => {
    const { result } = renderHook(() => useKreatifForRincianQuery("g1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
