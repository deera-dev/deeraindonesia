import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("../../lib/sync", () => ({
  syncPelanggan: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../lib/db", () => ({
  db: {
    pelanggan: {
      orderBy: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    },
  },
}));
vi.mock("./api", () => ({
  addPelanggan: vi.fn().mockResolvedValue({ id: "p1", nama: "BUDI" }),
  updatePelanggan: vi.fn().mockResolvedValue(undefined),
  deletePelanggan: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "../../lib/db";
import { syncPelanggan } from "../../lib/sync";
import { usePelanggan, searchPelanggan } from "./hooks";

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  db.pelanggan.toArray.mockResolvedValue([]);
});

describe("usePelanggan", () => {
  it("initializes loading=true", () => {
    db.pelanggan.toArray.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePelanggan());
    expect(result.current.loading).toBe(true);
  });

  it("sets loading=false after load", async () => {
    const { result } = renderHook(() => usePelanggan());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns pelanggan from db", async () => {
    db.pelanggan.toArray.mockResolvedValue([{ id: "p1", nama: "BUDI" }]);
    const { result } = renderHook(() => usePelanggan());
    await waitFor(() => expect(result.current.pelanggan.length).toBe(1));
    expect(result.current.pelanggan[0].nama).toBe("BUDI");
  });

  it("calls syncPelanggan when online", async () => {
    const { result } = renderHook(() => usePelanggan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(syncPelanggan).toHaveBeenCalled();
  });

  it("skips syncPelanggan when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => usePelanggan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(syncPelanggan).not.toHaveBeenCalled();
  });

  it("reload reads from db again", async () => {
    const { result } = renderHook(() => usePelanggan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = db.pelanggan.toArray.mock.calls.length;
    await act(async () => { await result.current.reload(); });
    expect(db.pelanggan.toArray.mock.calls.length).toBeGreaterThan(before);
  });
});

describe("searchPelanggan", () => {
  it("returns empty array for empty query", async () => {
    const res = await searchPelanggan("");
    expect(res).toEqual([]);
    expect(db.pelanggan.filter).not.toHaveBeenCalled();
  });

  it("calls db.pelanggan.filter for non-empty query", async () => {
    db.pelanggan.toArray.mockResolvedValue([{ id: "p1", nama: "BUDI" }]);
    await searchPelanggan("BU");
    expect(db.pelanggan.filter).toHaveBeenCalled();
  });
});
