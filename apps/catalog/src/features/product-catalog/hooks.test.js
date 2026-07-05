import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const soldOutQueryState = { data: undefined };
vi.mock("./queries", () => ({
  useSoldOutKodesQuery: () => soldOutQueryState,
  soldOutKeys: { all: ["sold-out-kodes"] },
}));

const modalState = {
  open: false,
  initOpen: vi.fn(),
  show: vi.fn(),
  close: vi.fn(),
};
vi.mock("./store", () => ({
  useVisitUsModalStore: (selector) => selector(modalState),
}));

const { useSoldOutSet, useVisitUsModal, soldOutKeys } = await import("./hooks");

beforeEach(() => {
  soldOutQueryState.data = undefined;
  modalState.open = false;
  modalState.initOpen.mockReset();
  modalState.show.mockReset();
  modalState.close.mockReset();
});

describe("useSoldOutSet", () => {
  it("fallback ke Set kosong saat data undefined", () => {
    const { result } = renderHook(() => useSoldOutSet());
    expect(result.current).toEqual(new Set());
  });

  it("mengembalikan Set dari data kode sold-out", () => {
    soldOutQueryState.data = ["D-01-OSK", "D-02-SFN"];
    const { result } = renderHook(() => useSoldOutSet());
    expect(result.current.has("D-01-OSK")).toBe(true);
    expect(result.current.has("D-99-XXX")).toBe(false);
  });
});

describe("useVisitUsModal", () => {
  it("mengembalikan open & action dari store", () => {
    modalState.open = true;
    const { result } = renderHook(() => useVisitUsModal());
    expect(result.current.open).toBe(true);

    result.current.show();
    result.current.close();
    result.current.initOpen();
    expect(modalState.show).toHaveBeenCalledTimes(1);
    expect(modalState.close).toHaveBeenCalledTimes(1);
    expect(modalState.initOpen).toHaveBeenCalledTimes(1);
  });
});

describe("re-export soldOutKeys dari ./queries", () => {
  it("tersedia untuk dipakai konsumen", () => {
    expect(soldOutKeys.all).toEqual(["sold-out-kodes"]);
  });
});
