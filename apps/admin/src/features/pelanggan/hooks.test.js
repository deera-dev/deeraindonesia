import { describe, it, expect, vi, beforeEach } from "vitest";

// Cegah real lib/supabase.js dari benar-benar membuat client Supabase nyata
// saat import-time (hooks.js → `export { searchPelanggan } from "./api"` →
// api.js → @deera/shared/lib/supabase).
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: {} }));

const pelangganListState = { data: undefined, isLoading: false, error: null };
const salesByPelangganState = { data: undefined, isLoading: false, error: null };
vi.mock("./queries", () => ({
  usePelangganListQuery: () => pelangganListState,
  useSalesByPelangganQuery: () => salesByPelangganState,
}));

const { searchPelanggan } = await import("./hooks");
const apiModule = await import("./api");

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("searchPelanggan (re-export dari ./api)", () => {
  it("adalah fungsi yang sama persis dengan yang di api.js", () => {
    expect(searchPelanggan).toBe(apiModule.searchPelanggan);
  });

  it("mengembalikan [] utk query kosong (tanpa perlu mock Supabase)", async () => {
    expect(await searchPelanggan("")).toEqual([]);
  });
});
