import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const soldOutQueryState = { data: undefined };
const limitedStokQueryState = { data: undefined };
vi.mock("./queries", () => ({
  useSoldOutKodesQuery: () => soldOutQueryState,
  useLimitedStokKodesQuery: () => limitedStokQueryState,
  soldOutKeys: { all: ["sold-out-kodes"] },
  limitedStokKeys: { all: ["limited-stok-kodes"] },
}));

const modalState = {
  open: false,
  initOpen: vi.fn(),
  show: vi.fn(),
  close: vi.fn(),
};
const searchState = {
  open: false,
  query: "",
  show: vi.fn(),
  close: vi.fn(),
  setQuery: vi.fn(),
};
const filterState = {
  open: false,
  bahan: null,
  ukuran: null,
  show: vi.fn(),
  close: vi.fn(),
  setBahan: vi.fn(),
  setUkuran: vi.fn(),
  reset: vi.fn(),
};
vi.mock("./store", () => ({
  useVisitUsModalStore: (selector) => selector(modalState),
  useCatalogSearchStore: (selector) => selector(searchState),
  useCatalogFilterStore: (selector) => selector(filterState),
}));

const {
  useSoldOutSet,
  useLimitedStokSet,
  useVisitUsModal,
  useCatalogSearch,
  useCatalogFilter,
  soldOutKeys,
  limitedStokKeys,
} = await import("./hooks");

beforeEach(() => {
  soldOutQueryState.data = undefined;
  limitedStokQueryState.data = undefined;
  modalState.open = false;
  modalState.initOpen.mockReset();
  modalState.show.mockReset();
  modalState.close.mockReset();
  searchState.open = false;
  searchState.query = "";
  searchState.show.mockReset();
  searchState.close.mockReset();
  searchState.setQuery.mockReset();
  filterState.open = false;
  filterState.bahan = null;
  filterState.ukuran = null;
  filterState.show.mockReset();
  filterState.close.mockReset();
  filterState.setBahan.mockReset();
  filterState.setUkuran.mockReset();
  filterState.reset.mockReset();
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

describe("re-export limitedStokKeys dari ./queries", () => {
  it("tersedia untuk dipakai konsumen", () => {
    expect(limitedStokKeys.all).toEqual(["limited-stok-kodes"]);
  });
});

describe("useLimitedStokSet", () => {
  it("fallback ke Set kosong saat data undefined", () => {
    const { result } = renderHook(() => useLimitedStokSet());
    expect(result.current).toEqual(new Set());
  });

  it("mengembalikan Set dari data kode limited-stok", () => {
    limitedStokQueryState.data = ["D-03-OSK"];
    const { result } = renderHook(() => useLimitedStokSet());
    expect(result.current.has("D-03-OSK")).toBe(true);
    expect(result.current.has("D-99-XXX")).toBe(false);
  });
});


describe("useCatalogSearch", () => {
  it("mengembalikan open, query, & action dari store", () => {
    searchState.open = true;
    searchState.query = "gamis dewi";
    const { result } = renderHook(() => useCatalogSearch());
    expect(result.current.open).toBe(true);
    expect(result.current.query).toBe("gamis dewi");

    result.current.show();
    result.current.close();
    result.current.setQuery("D-07");
    expect(searchState.show).toHaveBeenCalledTimes(1);
    expect(searchState.close).toHaveBeenCalledTimes(1);
    expect(searchState.setQuery).toHaveBeenCalledWith("D-07");
  });
});


describe("useCatalogFilter", () => {
  it("mengembalikan open, bahan, ukuran, & action dari store", () => {
    filterState.open = true;
    filterState.bahan = "Ceruti";
    filterState.ukuran = "Midi";
    const { result } = renderHook(() => useCatalogFilter());
    expect(result.current.open).toBe(true);
    expect(result.current.bahan).toBe("Ceruti");
    expect(result.current.ukuran).toBe("Midi");

    result.current.show();
    result.current.close();
    result.current.setBahan("Sifon");
    result.current.setUkuran("Gamis");
    result.current.reset();
    expect(filterState.show).toHaveBeenCalledTimes(1);
    expect(filterState.close).toHaveBeenCalledTimes(1);
    expect(filterState.setBahan).toHaveBeenCalledWith("Sifon");
    expect(filterState.setUkuran).toHaveBeenCalledWith("Gamis");
    expect(filterState.reset).toHaveBeenCalledTimes(1);
  });
});
