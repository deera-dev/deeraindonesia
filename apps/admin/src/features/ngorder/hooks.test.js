import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePetaRencanaStore } from "./store";
import { usePetaRencana } from "./hooks";

beforeEach(() => {
  usePetaRencanaStore.setState({ selectedIds: [] });
});

describe("usePetaRencana (Denny 2026-10-20: toko terpilih di peta Ngorder hilang kalau app di-close)", () => {
  it("mengekspos selectedIds dari store", () => {
    usePetaRencanaStore.setState({ selectedIds: ["t1", "t2"] });
    const { result } = renderHook(() => usePetaRencana());
    expect(result.current.selectedIds).toEqual(["t1", "t2"]);
  });

  it("toggle/addMany/clear memanggil action store yang sesuai", () => {
    const { result } = renderHook(() => usePetaRencana());

    act(() => result.current.toggle("t1"));
    expect(usePetaRencanaStore.getState().selectedIds).toEqual(["t1"]);

    act(() => result.current.addMany(["t2", "t3"]));
    expect(usePetaRencanaStore.getState().selectedIds).toEqual(["t1", "t2", "t3"]);

    act(() => result.current.clear());
    expect(usePetaRencanaStore.getState().selectedIds).toEqual([]);
  });
});
