import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  mapStyles,
  useMapStyles,
  useMigrateLegacyRencana,
  usePetaFilter,
  usePetaRencana,
} from "./hooks";
import { usePetaFilterStore } from "./store";

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

describe("useMigrateLegacyRencana (pilihan lama di localStorage → rencana bersama)", () => {
  const KEY = "ngorder_peta_rencana_v1";
  const tokoList = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];

  beforeEach(() => localStorage.clear());

  it("mengirim id lama yg masih ada & belum di rencana, lalu menghapus data lokal", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { selectedIds: ["t1", "t2", "t-hapus"] }, version: 0 }),
    );
    mocks.add.mockImplementation((_vars, opts) => opts.onSuccess());
    const rencana = { isLoading: false, byToko: new Map([["t2", { id: "k2" }]]) };
    renderHook(() => useMigrateLegacyRencana(tokoList, rencana));
    expect(mocks.add).toHaveBeenCalledWith(
      { tokoIds: ["t1"], user: { email: "a@deera.id", name: "Akun A" } },
      expect.any(Object),
    );
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("tidak jalan selama rencana masih dimuat, dan tanpa data lama tidak memanggil apa pun", () => {
    const { rerender } = renderHook(({ r }) => useMigrateLegacyRencana(tokoList, r), {
      initialProps: { r: { isLoading: true, byToko: new Map() } },
    });
    rerender({ r: { isLoading: false, byToko: new Map() } });
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("gagal kirim → data lokal tetap disimpan untuk dicoba lagi", () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { selectedIds: ["t3"] } }));
    mocks.add.mockImplementation((_vars, opts) => opts.onError(new Error("offline")));
    renderHook(() => useMigrateLegacyRencana(tokoList, { isLoading: false, byToko: new Map() }));
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});
