import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("../gajian", () => ({
  useGajianList: vi.fn(() => ({
    gajianList: [
      { id: "g1", tanggal_sabtu: "2026-07-04", status: "draft" },
      { id: "g2", tanggal_sabtu: "2026-06-27", status: "final" },
      { id: "g3" }, { id: "g4" }, { id: "g5" }, { id: "g6" },
    ],
    loading: false,
  })),
}));
vi.mock("../kasbon", () => ({
  useKasbonList: vi.fn(() => ({
    rows: [
      { id: "kb1", status: "belum", sisa: 100000 },
      { id: "kb2", status: "belum", sisa: 50000 },
      { id: "kb3", status: "lunas", sisa: 0 },
    ],
    loading: false,
  })),
}));
vi.mock("../pettycash", () => ({
  usePettycashAll: vi.fn(() => ({
    saldo: 300000,
    rows: [
      { tanggal: "2026-07-01", jenis: "isi", jumlah: 500000 },
      { tanggal: "2026-07-02", jenis: "keluar", jumlah: 200000 },
      { tanggal: "2026-05-01", jenis: "isi", jumlah: 100000 },
    ],
    loading: false,
  })),
}));

import { useDashboardStats } from "./hooks";
import { useKasbonList } from "../kasbon";

describe("useDashboardStats", () => {
  it("returns gajianRecent limited to 5 items", () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.gajianRecent).toHaveLength(5);
  });

  it("returns pettycashMasuk and pettycashKeluar for current month only", () => {
    const { result } = renderHook(() => useDashboardStats());
    // Only July 2026 rows: isi=500000, keluar=200000; May row excluded
    expect(result.current.pettycashMasuk).toBe(500000);
    expect(result.current.pettycashKeluar).toBe(200000);
  });

  it("returns pettycashSaldo (all-time)", () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.pettycashSaldo).toBe(300000);
  });

  it("counts only belum kasbon", () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.kasbonCount).toBe(2);
  });

  it("sums totalSisaKasbon from belum rows only", () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.totalSisaKasbon).toBe(150000);
  });

  it("loading is false when all sub-hooks are loaded", () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.loading).toBe(false);
  });

  it("handles belum kasbon with undefined sisa (defaults to 0)", () => {
    useKasbonList.mockReturnValueOnce({
      rows: [{ id: "kb1", status: "belum", sisa: undefined }],
      loading: false,
    });
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.totalSisaKasbon).toBe(0);
    expect(result.current.kasbonCount).toBe(1);
  });
});
