import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockFinalizeMutateAsync = vi.fn();
vi.mock("./queries", () => ({
  useGajianListQuery:              vi.fn(() => ({ data: [{ id: "g1" }], isLoading: false })),
  useGajianDetailQuery:            vi.fn(() => ({ data: { id: "g1" }, isLoading: false })),
  useCreateGajianPeriodeMutation:  vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteGajianPeriodeMutation:  vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveGajianRequestMutation:    vi.fn(() => ({ mutateAsync: vi.fn() })),
  useFinalizeGajianMutation:       vi.fn(() => ({ mutateAsync: mockFinalizeMutateAsync })),
  useGajianTotalsQuery:            vi.fn(() => ({ data: { gaji: 100000 }, isLoading: false })),
  useKaryawanIdsInGajianQuery:     vi.fn(() => ({ data: ["k1", "k2"] })),
  usePotongQuery:                  vi.fn(() => ({ data: [], isLoading: false })),
  useJahitQuery:                   vi.fn(() => ({ data: [], isLoading: false })),
  useFinishingQuery:               vi.fn(() => ({ data: null, isLoading: false })),
  useQCQuery:                      vi.fn(() => ({ data: [], isLoading: false })),
  useKreatifQuery:                 vi.fn(() => ({ data: [], isLoading: false })),
  useCmtQuery:                     vi.fn(() => ({ data: [], isLoading: false })),
  useProdukListQuery:              vi.fn(() => ({ data: [], isLoading: false })),
  useUpahJahitMapQuery:            vi.fn(() => ({ data: { "D-01-OSK": 27000 }, isLoading: false })),
  useUpahJahitHistoryMapQuery:     vi.fn(() => ({ data: { "D-01-OSK": 25000 }, isLoading: false })),
  useSavePotongMutation:           vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeletePotongMutation:         vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveJahitMutation:            vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteJahitMutation:          vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveFinishingMutation:        vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteFinishingMutation:      vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveQCMutation:               vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteQCMutation:             vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveKreatifMutation:          vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteKreatifMutation:        vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveCmtMutation:              vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteCmtMutation:            vi.fn(() => ({ mutateAsync: vi.fn() })),
  usePotongForRincianQuery:        vi.fn(() => ({ data: [], isLoading: false })),
  useJahitForRincianQuery:         vi.fn(() => ({ data: [], isLoading: false })),
  useQCForRincianQuery:            vi.fn(() => ({ data: [], isLoading: false })),
  useKreatifForRincianQuery:       vi.fn(() => ({ data: [], isLoading: false })),
}));
const mockApplyKasbonDeduction = vi.fn();
vi.mock("../kasbon/hooks", () => ({
  useKasbonBelumLunasByKaryawanIds: vi.fn(() => ({ kasbon: [], loading: false })),
  useApplyKasbonDeduction:          vi.fn(() => mockApplyKasbonDeduction),
}));
vi.mock("../pengaturan/hooks", () => ({
  useFinanceConfig: vi.fn(() => ({ config: { tarif_pola: 10000 }, loading: false })),
}));
const mockSavePettycash = vi.fn();
vi.mock("../pettycash/hooks", () => ({
  usePettycashAll: vi.fn(() => ({ rows: [], saldo: -2895800, loading: false })),
  useSavePettycash: vi.fn(() => mockSavePettycash),
}));

import {
  useGajianList, useGajianDetail, useCreateGajianPeriode, useDeleteGajianPeriode,
  useSaveGajianRequest, useGajianTotals, useKaryawanIdsInGajian, useKasbonForGajian,
  usePotong, useSavePotong, useDeletePotong,
  useJahit, useSaveJahit, useDeleteJahit,
  useFinishing, useSaveFinishing, useDeleteFinishing,
  useQC, useSaveQC, useDeleteQC,
  useKreatif, useSaveKreatif, useDeleteKreatif,
  useCmt, useSaveCmt, useDeleteCmt,
  useProdukList, useUpahJahitMap, useUpahJahitHistoryMap, usePettycashTerpakai,
  useFinalizeGajian,
} from "./hooks";

const w = () => {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useGajianList", () => {
  it("returns gajianList array", () => {
    const { result } = renderHook(() => useGajianList(), { wrapper: w() });
    expect(result.current.gajianList).toHaveLength(1);
  });
});

describe("useGajianDetail", () => {
  it("returns gajian object", () => {
    const { result } = renderHook(() => useGajianDetail("g1"), { wrapper: w() });
    expect(result.current.gajian?.id).toBe("g1");
  });
});

describe("mutation hooks return functions", () => {
  const cases = [
    ["useCreateGajianPeriode", useCreateGajianPeriode],
    ["useDeleteGajianPeriode", useDeleteGajianPeriode],
    ["useSaveGajianRequest", useSaveGajianRequest],
    ["useSavePotong", useSavePotong],
    ["useDeletePotong", useDeletePotong],
    ["useSaveJahit", useSaveJahit],
    ["useDeleteJahit", useDeleteJahit],
    ["useSaveFinishing", useSaveFinishing],
    ["useDeleteFinishing", useDeleteFinishing],
    ["useSaveQC", useSaveQC],
    ["useDeleteQC", useDeleteQC],
    ["useSaveKreatif", useSaveKreatif],
    ["useDeleteKreatif", useDeleteKreatif],
    ["useSaveCmt", useSaveCmt],
    ["useDeleteCmt", useDeleteCmt],
  ];
  for (const [name, hook] of cases) {
    it(`${name} returns function`, () => {
      const { result } = renderHook(() => hook(), { wrapper: w() });
      expect(typeof result.current).toBe("function");
    });
  }
});

describe("query hooks", () => {
  it("useGajianTotals returns totals", () => {
    const { result } = renderHook(() => useGajianTotals("g1"), { wrapper: w() });
    expect(result.current.totals?.gaji).toBe(100000);
  });
  it("useKaryawanIdsInGajian returns array", () => {
    const { result } = renderHook(() => useKaryawanIdsInGajian("g1"), { wrapper: w() });
    expect(Array.isArray(result.current)).toBe(true);
  });
  it("useKasbonForGajian returns kasbon array", () => {
    const { result } = renderHook(() => useKasbonForGajian("g1"), { wrapper: w() });
    expect(Array.isArray(result.current.kasbon)).toBe(true);
  });
  it("usePotong returns rows", () => {
    const { result } = renderHook(() => usePotong("g1"), { wrapper: w() });
    expect(Array.isArray(result.current.rows)).toBe(true);
  });
  it("useFinishing returns record", () => {
    const { result } = renderHook(() => useFinishing("g1"), { wrapper: w() });
    expect(result.current.record).toBeNull();
  });
  it("useProdukList returns produkList", () => {
    const { result } = renderHook(() => useProdukList(), { wrapper: w() });
    expect(Array.isArray(result.current.produkList)).toBe(true);
  });
  it("useUpahJahitMap returns upahJahitByKode map", () => {
    const { result } = renderHook(() => useUpahJahitMap(), { wrapper: w() });
    expect(result.current.upahJahitByKode).toEqual({ "D-01-OSK": 27000 });
  });
  it("useUpahJahitHistoryMap returns upahHistoryByKode map", () => {
    const { result } = renderHook(() => useUpahJahitHistoryMap(), { wrapper: w() });
    expect(result.current.upahHistoryByKode).toEqual({ "D-01-OSK": 25000 });
  });
});

describe("usePettycashTerpakai", () => {
  it("mengembalikan nilai positif dari saldo minus (Uang Denny & Wulan Terpakai)", () => {
    const { result } = renderHook(() => usePettycashTerpakai(), { wrapper: w() });
    expect(result.current.total).toBe(2895800);
    expect(result.current.loading).toBe(false);
  });
});

// Permintaan Denny 2026-09: dulu setelah gajian bayar reimburse "Uang Denny
// & Wulan Terpakai" ke mereka, ada langkah manual terpisah ke halaman Petty
// Cash utk catat "Isi Ulang" senilai yang sama (biar saldo Petty Cash balik
// ke 0, bukan terus minus) — sekarang harus otomatis begitu gajian
// difinalisasi, lihat komentar di useFinalizeGajian (hooks.js).
describe("useFinalizeGajian", () => {
  const gajian = { id: "g1", tanggal_sabtu: "2026-09-05" };

  beforeEach(() => {
    mockFinalizeMutateAsync.mockClear();
    mockApplyKasbonDeduction.mockClear();
    mockSavePettycash.mockClear();
  });

  it("mencatat isi-ulang Petty Cash otomatis sebesar pettycash yang direimburse", async () => {
    const { result } = renderHook(() => useFinalizeGajian(), { wrapper: w() });
    await result.current(gajian, {
      totals: { gaji: 100000 },
      pettycash: 2895800,
      tambahan: [],
      kasbon: [],
      kasbonDeductions: [],
      totalRequest: 2995800,
    });
    expect(mockSavePettycash).toHaveBeenCalledTimes(1);
    const [payload, editing] = mockSavePettycash.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        jenis: "isi",
        jumlah: 2895800,
        keterangan: expect.stringContaining("2026-09-05"),
      }),
    );
    expect(editing).toBeNull();
  });

  it("TIDAK mencatat apa pun ke Petty Cash kalau pettycash = 0 (switch dimatikan)", async () => {
    const { result } = renderHook(() => useFinalizeGajian(), { wrapper: w() });
    await result.current(gajian, {
      totals: { gaji: 100000 },
      pettycash: 0,
      tambahan: [],
      kasbon: [],
      kasbonDeductions: [],
      totalRequest: 100000,
    });
    expect(mockSavePettycash).not.toHaveBeenCalled();
  });

  it("tetap menerapkan potongan kasbon seperti sebelumnya (tidak regresi)", async () => {
    const { result } = renderHook(() => useFinalizeGajian(), { wrapper: w() });
    const kasbon = [{ id: "kb1" }];
    await result.current(gajian, {
      totals: {},
      pettycash: 0,
      tambahan: [],
      kasbon,
      kasbonDeductions: [{ kasbon_id: "kb1", jumlah: 50000 }],
      totalRequest: 50000,
    });
    expect(mockApplyKasbonDeduction).toHaveBeenCalledTimes(1);
    expect(mockApplyKasbonDeduction).toHaveBeenCalledWith(
      kasbon[0],
      expect.objectContaining({ jumlah: 50000, keterangan: expect.stringContaining("2026-09-05") }),
    );
  });

  it("memanggil finalize dgn payload yg benar", async () => {
    const { result } = renderHook(() => useFinalizeGajian(), { wrapper: w() });
    await result.current(gajian, {
      totals: { gaji: 100000 },
      pettycash: 0,
      tambahan: [],
      kasbon: [],
      kasbonDeductions: [],
      totalRequest: 100000,
    });
    expect(mockFinalizeMutateAsync).toHaveBeenCalledWith({
      gajianId: "g1",
      payload: expect.objectContaining({ totalRequest: 100000 }),
    });
  });
});
