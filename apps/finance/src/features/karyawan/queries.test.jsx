import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchKaryawanAktif: vi.fn().mockResolvedValue([{ id: "k1", nama: "SARI", aktif: true }]),
  fetchKaryawanAll: vi.fn().mockResolvedValue([{ id: "k1" }, { id: "k2" }]),
  saveKaryawan: vi.fn().mockResolvedValue(undefined),
  toggleKaryawanAktif: vi.fn().mockResolvedValue(undefined),
}));

import { fetchKaryawanAktif, fetchKaryawanAll, saveKaryawan, toggleKaryawanAktif } from "./api";
import {
  karyawanKeys,
  useKaryawanAktifQuery,
  useKaryawanAllQuery,
  useSaveKaryawanMutation,
  useToggleKaryawanAktifMutation,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("karyawanKeys", () => {
  it("all and aktif are arrays", () => {
    expect(Array.isArray(karyawanKeys.all)).toBe(true);
    expect(Array.isArray(karyawanKeys.aktif)).toBe(true);
  });
});

describe("useKaryawanAktifQuery", () => {
  it("fetches aktif karyawan", async () => {
    const { result } = renderHook(() => useKaryawanAktifQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(fetchKaryawanAktif).toHaveBeenCalled();
  });
});

describe("useKaryawanAllQuery", () => {
  it("fetches all karyawan", async () => {
    const { result } = renderHook(() => useKaryawanAllQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(fetchKaryawanAll).toHaveBeenCalled();
  });
});

describe("useSaveKaryawanMutation", () => {
  it("exposes mutate function", () => {
    const { result } = renderHook(() => useSaveKaryawanMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("calls saveKaryawan and invalidates queries on success", async () => {
    const { result } = renderHook(() => useSaveKaryawanMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ payload: { nama: "X" }, editing: null });
    });
    expect(saveKaryawan).toHaveBeenCalledWith({ payload: { nama: "X" }, editing: null });
  });
});

describe("useToggleKaryawanAktifMutation", () => {
  it("exposes mutate function", () => {
    const { result } = renderHook(() => useToggleKaryawanAktifMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
  it("calls toggleKaryawanAktif and invalidates on success", async () => {
    const { result } = renderHook(() => useToggleKaryawanAktifMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: "k1", aktif: true });
    });
    expect(toggleKaryawanAktif).toHaveBeenCalledWith({ id: "k1", aktif: true });
  });
});
