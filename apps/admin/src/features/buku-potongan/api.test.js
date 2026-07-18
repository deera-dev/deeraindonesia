import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchBukuPotonganData, upsertExpectedStok } = await import("./api");

beforeEach(() => { resetSupabaseMock(supabaseMock); });

describe("fetchBukuPotonganData", () => {
  function mockAllSources(stokData, expData, expError = null, soldData = {}, soldError = null) {
    supabaseMock.from.mockImplementation((table) => {
      if (table === "stok_warna") return makeBuilder({ data: stokData, error: null });
      if (table === "expected_stok") return makeBuilder({ data: expData, error: expError });
      return makeBuilder({ data: null, error: null });
    });
    supabaseMock.rpc.mockResolvedValue({ data: soldData, error: soldError });
  }

  it("mengembalikan stokRows, expectedRows, soldMap, tableError=false saat semua sukses", async () => {
    const stokRows = [{ kode: "D-01", size: "Midi", warna: "_", gudang: 5, cideng: 2, tegalgubug: 1 }];
    const expRows = [{ kode: "D-01", size: "Midi", warna: "_", expected_qty: 10 }];
    const soldMap = { "D-01": { Midi: { _: 4 } } };
    mockAllSources(stokRows, expRows, null, soldMap);

    const result = await fetchBukuPotonganData();

    expect(result.stokRows).toBe(stokRows);
    expect(result.expectedRows).toBe(expRows);
    expect(result.soldMap).toBe(soldMap);
    expect(result.tableError).toBe(false);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_sold_summary_by_variant");
  });

  it("tableError=true saat expected_stok mengembalikan error code 42P01 (tabel belum ada)", async () => {
    const pgError = { code: "42P01", message: "table not found" };
    mockAllSources([{ kode: "D-01" }], null, pgError);

    const result = await fetchBukuPotonganData();

    expect(result.tableError).toBe(true);
    expect(result.expectedRows).toEqual([]);
  });

  it("data null → stokRows & expectedRows fallback ke [], soldMap fallback ke {}", async () => {
    mockAllSources(null, null, null, null);

    const result = await fetchBukuPotonganData();

    expect(result.stokRows).toEqual([]);
    expect(result.expectedRows).toEqual([]);
    expect(result.soldMap).toEqual({});
    expect(result.tableError).toBe(false);
  });

  it("RPC get_sold_summary_by_variant gagal → soldMap fallback ke {} (tidak melempar error)", async () => {
    mockAllSources([{ kode: "D-01" }], [{ kode: "D-01" }], null, null, new Error("rpc fail"));

    const result = await fetchBukuPotonganData();

    expect(result.soldMap).toEqual({});
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
