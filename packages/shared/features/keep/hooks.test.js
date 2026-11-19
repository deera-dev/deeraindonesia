import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const useActiveKeepItemsQuery = vi.fn();
vi.mock("./queries", () => ({ useActiveKeepItemsQuery: (...args) => useActiveKeepItemsQuery(...args) }));

const { useKeepQtyByKode, useKeepQtyDetail } = await import("./hooks");

const items = [
  { kode: "D-070-BAG", size: "Midi", warna: [{ nama: "UNGU", qty: 3 }] },
  { kode: "D-070-BAG", size: "Midi", warna: [{ nama: "HITAM", qty: 2 }] },
];

describe("useKeepQtyByKode", () => {
  beforeEach(() => {
    useActiveKeepItemsQuery.mockReset();
  });

  it("mengembalikan agregasi qty per kode dari data query", () => {
    useActiveKeepItemsQuery.mockReturnValue({ data: items });
    const { result } = renderHook(() => useKeepQtyByKode(), { wrapper: createQueryWrapper() });
    expect(result.current).toEqual({ "D-070-BAG": 5 });
  });

  it("mengembalikan object kosong saat data belum ada (masih loading)", () => {
    useActiveKeepItemsQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useKeepQtyByKode(), { wrapper: createQueryWrapper() });
    expect(result.current).toEqual({});
  });
});

describe("useKeepQtyDetail", () => {
  beforeEach(() => {
    useActiveKeepItemsQuery.mockReset();
  });

  it("mengembalikan breakdown kode->size->warna dari data query", () => {
    useActiveKeepItemsQuery.mockReturnValue({ data: items });
    const { result } = renderHook(() => useKeepQtyDetail(), { wrapper: createQueryWrapper() });
    expect(result.current).toEqual({ "D-070-BAG": { Midi: { UNGU: 3, HITAM: 2 } } });
  });

  it("mengembalikan object kosong saat data belum ada (masih loading)", () => {
    useActiveKeepItemsQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useKeepQtyDetail(), { wrapper: createQueryWrapper() });
    expect(result.current).toEqual({});
  });
});
