import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePetaRencanaStore } from "./store";

beforeEach(() => {
  usePetaRencanaStore.setState({ selectedIds: [] });
});

describe("usePetaRencanaStore (Denny 2026-10-20: toko terpilih di peta Ngorder hilang kalau app di-close)", () => {
  it("state awal selectedIds kosong", () => {
    const { result } = renderHook(() => usePetaRencanaStore((s) => s));
    expect(result.current.selectedIds).toEqual([]);
  });

  it("toggle: menambah id yang belum ada", () => {
    const { result } = renderHook(() => usePetaRencanaStore((s) => s));
    act(() => result.current.toggle("t1"));
    expect(result.current.selectedIds).toEqual(["t1"]);
  });

  it("toggle: menghapus id yang sudah ada (toggle off)", () => {
    const { result } = renderHook(() => usePetaRencanaStore((s) => s));
    act(() => result.current.toggle("t1"));
    act(() => result.current.toggle("t1"));
    expect(result.current.selectedIds).toEqual([]);
  });

  it("addMany: menambah beberapa id sekaligus tanpa duplikat", () => {
    const { result } = renderHook(() => usePetaRencanaStore((s) => s));
    act(() => result.current.toggle("t1"));
    act(() => result.current.addMany(["t1", "t2", "t3"]));
    expect(result.current.selectedIds).toEqual(["t1", "t2", "t3"]);
  });

  it("clear: mengosongkan selectedIds", () => {
    const { result } = renderHook(() => usePetaRencanaStore((s) => s));
    act(() => result.current.addMany(["t1", "t2"]));
    act(() => result.current.clear());
    expect(result.current.selectedIds).toEqual([]);
  });

  it("getState() mengembalikan state terkini tanpa render (dipakai lintas remount komponen)", () => {
    usePetaRencanaStore.setState({ selectedIds: ["t9"] });
    expect(usePetaRencanaStore.getState().selectedIds).toEqual(["t9"]);
  });
});
