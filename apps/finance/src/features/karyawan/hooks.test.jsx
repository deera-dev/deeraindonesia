import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./queries", () => ({
  useKaryawanAktifQuery:          vi.fn(() => ({ data: [{ id: "k1", aktif: true }], isLoading: false })),
  useKaryawanAllQuery:            vi.fn(() => ({ data: [{ id: "k1" }, { id: "k2" }], isLoading: false })),
  useSaveKaryawanMutation:        vi.fn(() => ({ mutateAsync: vi.fn() })),
  useToggleKaryawanAktifMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useKaryawanList, useKaryawanAktif, useSaveKaryawan, useToggleKaryawanAktif } from "./hooks";
import {
  useKaryawanAllQuery, useKaryawanAktifQuery,
  useSaveKaryawanMutation, useToggleKaryawanAktifMutation,
} from "./queries";

const w = () => {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useKaryawanList", () => {
  it("returns karyawan array and loading=false", () => {
    const { result } = renderHook(() => useKaryawanList(), { wrapper: w() });
    expect(result.current.karyawan).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });
  it("returns empty array when data is null", () => {
    useKaryawanAllQuery.mockReturnValueOnce({ data: null, isLoading: false });
    const { result } = renderHook(() => useKaryawanList(), { wrapper: w() });
    expect(result.current.karyawan).toEqual([]);
  });
});

describe("useKaryawanAktif", () => {
  it("returns only aktif karyawan", () => {
    const { result } = renderHook(() => useKaryawanAktif(), { wrapper: w() });
    expect(result.current.karyawan).toHaveLength(1);
  });
  it("returns empty array when data is null", () => {
    useKaryawanAktifQuery.mockReturnValueOnce({ data: null, isLoading: false });
    const { result } = renderHook(() => useKaryawanAktif(), { wrapper: w() });
    expect(result.current.karyawan).toEqual([]);
  });
});

describe("useSaveKaryawan", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useSaveKaryawan(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
  it("returned fn calls mutateAsync with correct args", async () => {
    const mockMutate = vi.fn().mockResolvedValue(undefined);
    useSaveKaryawanMutation.mockReturnValueOnce({ mutateAsync: mockMutate });
    const { result } = renderHook(() => useSaveKaryawan(), { wrapper: w() });
    await result.current({ nama: "X" }, { id: "k1" });
    expect(mockMutate).toHaveBeenCalledWith({ payload: { nama: "X" }, editing: { id: "k1" } });
  });
});

describe("useToggleKaryawanAktif", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useToggleKaryawanAktif(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
  it("returned fn calls mutateAsync with karyawan arg", async () => {
    const mockMutate = vi.fn().mockResolvedValue(undefined);
    useToggleKaryawanAktifMutation.mockReturnValueOnce({ mutateAsync: mockMutate });
    const { result } = renderHook(() => useToggleKaryawanAktif(), { wrapper: w() });
    await result.current({ id: "k1", aktif: true });
    expect(mockMutate).toHaveBeenCalledWith({ id: "k1", aktif: true });
  });
});
