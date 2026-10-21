import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  rows: [],
  add: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "a@deera.id", user_metadata: { full_name: "Akun A" } } }),
}));
vi.mock("./queries", async () => ({
  ...(await vi.importActual("./queries")),
  useRencanaQuery: () => ({ data: mocks.rows, isLoading: false }),
  useAddRencanaMutation: () => ({ mutate: mocks.add }),
  useRemoveRencanaMutation: () => ({ mutate: mocks.remove }),
  useUpdateKunjunganMutation: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

import { useThemeStore } from "@deera/shared/features/theme/store";
import { usePetaFilterStore } from "./store";
import { usePetaRencana, usePetaFilter, useMapStyles, mapStyles } from "./hooks";

beforeEach(() => {
  mocks.rows = [];
  mocks.add.mockReset();
  mocks.remove.mockReset();
  mocks.update.mockReset();
});

describe("usePetaRencana (rencana kunjungan bersama semua akun)", () => {
  it("toggle toko yang belum ada di rencana → add dengan identitas akun", () => {
    const { result } = renderHook(() => usePetaRencana());
    act(() => result.current.toggle("t1"));
    expect(mocks.add).toHaveBeenCalledWith(
      { tokoIds: ["t1"], user: { email: "a@deera.id", name: "Akun A" } },
      expect.any(Object),
    );
  });

  it("toggle toko yang sudah ada → remove baris kunjungannya", () => {
    mocks.rows = [{ id: "k1", toko_id: "t1", status: "rencana" }];
    const { result } = renderHook(() => usePetaRencana());
    expect(result.current.byToko.get("t1").id).toBe("k1");
    act(() => result.current.toggle("t1"));
    expect(mocks.remove).toHaveBeenCalledWith([mocks.rows[0]], expect.any(Object));
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("baris optimistik (tmp-) tidak bisa di-toggle sebelum tersimpan", () => {
    mocks.rows = [{ id: "tmp-t1", toko_id: "t1", status: "rencana" }];
    const { result } = renderHook(() => usePetaRencana());
    act(() => result.current.toggle("t1"));
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("clear melewati baris tmp-, updateKunjungan meneruskan akun", async () => {
    mocks.rows = [
      { id: "k1", toko_id: "t1" },
      { id: "tmp-t2", toko_id: "t2" },
    ];
    const { result } = renderHook(() => usePetaRencana());
    act(() => result.current.clear());
    expect(mocks.remove).toHaveBeenCalledWith([mocks.rows[0]], expect.any(Object));
    await result.current.updateKunjungan(mocks.rows[0], { status: "selesai" });
    expect(mocks.update).toHaveBeenCalledWith({
      row: mocks.rows[0],
      patch: { status: "selesai" },
      user: { email: "a@deera.id", name: "Akun A" },
    });
  });
});

describe("usePetaFilter", () => {
  it("membaca & mengubah filter peta lewat store", () => {
    usePetaFilterStore.setState({ daerah: "", approach: "", search: "", sheetTab: "rencana" });
    const { result } = renderHook(() => usePetaFilter());
    act(() => result.current.setFilter({ daerah: "TEGAL", search: "gamis" }));
    expect(result.current.daerah).toBe("TEGAL");
    expect(result.current.search).toBe("gamis");
    act(() => result.current.resetFilter());
    expect(result.current.daerah).toBe("");
    expect(result.current.sheetTab).toBe("rencana");
  });
});

describe("useMapStyles", () => {
  it("mengikuti theme: dark → style gelap, light → style dasar", () => {
    useThemeStore.setState({ theme: "dark" });
    const { result, rerender } = renderHook(() => useMapStyles());
    expect(result.current).toEqual(mapStyles(true));

    act(() => useThemeStore.setState({ theme: "light" }));
    rerender();
    expect(result.current).toEqual(mapStyles(false));
  });
});
