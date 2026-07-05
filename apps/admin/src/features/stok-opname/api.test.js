import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const logHistoryMock = vi.fn();
vi.mock("../history/api", () => ({
  logHistory: (...a) => logHistoryMock(...a),
}));

const { fetchAllStokWarna, saveStokOpname } = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  logHistoryMock.mockReset();
});

describe("fetchAllStokWarna", () => {
  it("mengembalikan semua baris stok_warna", async () => {
    const rows = [{ id: "1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 5 }];
    supabaseMock.from.mockReturnValue(makeBuilder({ data: rows, error: null }));

    expect(await fetchAllStokWarna()).toBe(rows);
  });

  it("mengembalikan [] saat data null", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await fetchAllStokWarna()).toEqual([]);
  });
});

describe("saveStokOpname", () => {
  const stokRows = [
    { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 3, cideng: 2, tegalgubug: 1 },
    { id: "r2", kode: "D-01-OSK", size: "Gamis", warna: "MERAH", gudang: 5, cideng: 0, tegalgubug: 0 },
    { id: "r3", kode: "D-02-OSK", size: "Midi", warna: "_", gudang: 10, cideng: 5, tegalgubug: 2 },
  ];
  const products = [
    { kode: "D-01-OSK", nama: "Gamis A" },
    { kode: "D-02-OSK", nama: "Gamis B" },
  ];

  it("mengembalikan count=0 saat changed kosong (early return)", async () => {
    const result = await saveStokOpname({ changed: {}, stokRows, products });
    expect(result).toEqual({ count: 0 });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("upsert ke stok_warna dengan merged values & mengembalikan count", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const result = await saveStokOpname({
      changed: {
        r1: { gudang: 10 },        // hanya gudang berubah
        r3: { cideng: 8, tegalgubug: 3 }, // cideng & tegalgubug berubah
      },
      stokRows,
      products,
    });

    expect(result).toEqual({ count: 2 });
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 10, cideng: 2, tegalgubug: 1 }),
        expect.objectContaining({ id: "r3", kode: "D-02-OSK", size: "Midi", warna: "_", gudang: 10, cideng: 8, tegalgubug: 3 }),
      ]),
      { onConflict: "kode,size,warna" }
    );
  });

  it("logHistory dipanggil per kode unik yang berubah (fire-and-forget, tidak tunggu)", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);
    logHistoryMock.mockResolvedValue(undefined);

    await saveStokOpname({
      changed: { r1: { gudang: 10 }, r2: { gudang: 7 } }, // dua baris, satu kode (D-01-OSK)
      stokRows,
      products,
    });

    expect(logHistoryMock).toHaveBeenCalledTimes(1);
    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "stok-opname", category: "stok", kode: "D-01-OSK", nama: "Gamis A" })
    );
  });

  it("logHistory nama fallback ke kode jika produk tidak ditemukan", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);
    logHistoryMock.mockResolvedValue(undefined);

    await saveStokOpname({
      changed: { r1: { gudang: 5 } },
      stokRows,
      products: [], // produk tidak ditemukan
    });

    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "D-01-OSK" }) // fallback ke kode
    );
  });

  it("melempar error saat upsert gagal", async () => {
    const errBuilder = makeBuilder({ data: null, error: new Error("upsert fail") });
    supabaseMock.from.mockReturnValue(errBuilder);

    await expect(saveStokOpname({ changed: { r1: { gudang: 1 } }, stokRows, products })).rejects.toThrow("upsert fail");
  });
});
