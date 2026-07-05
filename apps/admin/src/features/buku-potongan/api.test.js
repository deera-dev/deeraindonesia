import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchBukuPotonganData, upsertExpectedStok } = await import("./api");

beforeEach(() => { resetSupabaseMock(supabaseMock); });

describe("fetchBukuPotonganData", () => {
  function mockBothTables(stokData, expData, expError = null) {
    supabaseMock.from.mockImplementation((table) => {
      if (table === "stok_warna") return makeBuilder({ data: stokData, error: null });
      if (table === "expected_stok") return makeBuilder({ data: expData, error: expError });
      return makeBuilder({ data: null, error: null });
    });
  }

  it("mengembalikan stokRows, expectedRows, tableError=false saat keduanya sukses", async () => {
    const stokRows = [{ kode: "D-01", size: "Midi", warna: "_", gudang: 5, cideng: 2, tegalgubug: 1 }];
    const expRows = [{ kode: "D-01", size: "Midi", warna: "_", expected_qty: 10 }];
    mockBothTables(stokRows, expRows);

    const result = await fetchBukuPotonganData();

    expect(result.stokRows).toBe(stokRows);
    expect(result.expectedRows).toBe(expRows);
    expect(result.tableError).toBe(false);
  });

  it("tableError=true saat expected_stok mengembalikan error code 42P01 (tabel belum ada)", async () => {
    const pgError = { code: "42P01", message: "table not found" };
    mockBothTables([{ kode: "D-01" }], null, pgError);

    const result = await fetchBukuPotonganData();

    expect(result.tableError).toBe(true);
    expect(result.expectedRows).toEqual([]);
  });

  it("data null → stokRows & expectedRows fallback ke []", async () => {
    mockBothTables(null, null);

    const result = await fetchBukuPotonganData();

    expect(result.stokRows).toEqual([]);
    expect(result.expectedRows).toEqual([]);
    expect(result.tableError).toBe(false);
  });
});

describe("upsertExpectedStok", () => {
  it("upsert ke expected_stok dengan updated_at & mengembalikan rows", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const rows = [{ kode: "D-01", size: "Midi", warna: "_", expected_qty: 10 }];
    const result = await upsertExpectedStok(rows);

    expect(supabaseMock.from).toHaveBeenCalledWith("expected_stok");
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ kode: "D-01", expected_qty: 10, updated_at: expect.any(String) })]),
      { onConflict: "kode,size,warna" }
    );
    expect(result[0].updated_at).toBeTypeOf("string");
  });

  it("melempar error saat upsert gagal", async () => {
    const errBuilder = makeBuilder({ data: null, error: new Error("upsert fail") });
    supabaseMock.from.mockReturnValue(errBuilder);

    await expect(upsertExpectedStok([{ kode: "X", size: "Midi", warna: "_", expected_qty: 0 }])).rejects.toThrow("upsert fail");
  });
});
