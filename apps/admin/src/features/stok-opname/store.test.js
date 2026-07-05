import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStokOpnameDraftStore } from "./store";

beforeEach(() => {
  useStokOpnameDraftStore.setState({ changed: {} });
});

describe("useStokOpnameDraftStore", () => {
  it("state awal: changed kosong", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));
    expect(result.current.changed).toEqual({});
  });

  it("setValue: menyimpan nilai untuk rowId + lokasi", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r1", "gudang", "5"); });

    expect(result.current.changed.r1).toEqual({ gudang: 5 });
  });

  it("setValue: nilai diklampa ke max(0, parseInt)", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r1", "gudang", "-10"); });
    expect(result.current.changed.r1.gudang).toBe(0);
  });

  it("setValue: string non-angka → 0", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r1", "gudang", "abc"); });
    expect(result.current.changed.r1.gudang).toBe(0);
  });

  it("setValue: nilai '' → hapus key lokasi; jika kosong → hapus rowId", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r1", "gudang", "5"); });
    act(() => { result.current.setValue("r1", "gudang", ""); });

    expect(result.current.changed.r1).toBeUndefined();
  });

  it("setValue: null/undefined → hapus key lokasi", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r2", "cideng", "3"); });
    act(() => { result.current.setValue("r2", "cideng", null); });

    expect(result.current.changed.r2).toBeUndefined();
  });

  it("beberapa lokasi dalam satu rowId disimpan bersamaan", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r1", "gudang", "5"); });
    act(() => { result.current.setValue("r1", "cideng", "3"); });

    expect(result.current.changed.r1).toEqual({ gudang: 5, cideng: 3 });
  });

  it("clear: menghapus semua changed", () => {
    const { result } = renderHook(() => useStokOpnameDraftStore((s) => s));

    act(() => { result.current.setValue("r1", "gudang", "5"); });
    act(() => { result.current.clear(); });

    expect(result.current.changed).toEqual({});
  });
});
