import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const logHistoryMock = vi.fn();
vi.mock("../history/api", () => ({
  logHistory: (...a) => logHistoryMock(...a),
}));

const {
  fetchAllStokWarna,
  saveStokOpname,
  fetchJahitDikerjakan,
  planOpnameOverflow,
  fetchCycleCountChecked,
  fetchCycleCountKategori,
} = await import("./api");
const { syntheticStokId } = await import("./utils");

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
        r1: { gudang: 10 },
        r3: { cideng: 8, tegalgubug: 3 },
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

  // BUG FIX (November 2026, laporan admin: "saya input ngorder stock opname
  // tapi tidak bertambah sama sekali... ga ada errornya ini, tapi stoknya ga
  // bertambah") — merged/upsertRows di sini SEMPAT cuma hardcode
  // gudang/cideng/tegalgubug, jadi vals.ngorder yang diketik admin tidak
  // pernah ikut terkirim ke upsert (upsert "sukses" tanpa error krn cuma
  // nulis ulang gudang/cideng/tegalgubug yang sama persis, bukan krn ngorder
  // beneran tersimpan).
  it("upsert ikut mengirim ngorder yang berubah (bukan cuma gudang/cideng/tegalgubug)", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    await saveStokOpname({
      changed: { r1: { ngorder: 7 } },
      stokRows,
      products,
    });

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "r1", gudang: 3, cideng: 2, tegalgubug: 1, ngorder: 7 }),
      ]),
      { onConflict: "kode,size,warna" },
    );
  });

  it("baris tanpa ngorder sebelumnya (undefined) fallback ke 0, bukan dibiarkan tak terkirim", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    await saveStokOpname({
      changed: { r2: { gudang: 6 } },
      stokRows,
      products,
    });

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "r2", gudang: 6, ngorder: 0 })]),
      { onConflict: "kode,size,warna" },
    );
  });

  it("mencatat cycle_count_checked per kode+lokasi yang disentuh sesi ini", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    await saveStokOpname({
      changed: {
        r1: { gudang: 10 },
        r3: { cideng: 8, tegalgubug: 3 },
      },
      stokRows,
      products,
    });

    const cycleCountCall = upsertBuilder.upsert.mock.calls.find(([rows]) =>
      rows.some((r) => "location" in r),
    );
    expect(cycleCountCall).toBeDefined();
    const [rows, opts] = cycleCountCall;
    expect(opts).toEqual({ onConflict: "kode,location" });
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kode: "D-01-OSK", location: "gudang" }),
        expect.objectContaining({ kode: "D-02-OSK", location: "cideng" }),
        expect.objectContaining({ kode: "D-02-OSK", location: "tegalgubug" }),
      ]),
    );
  });

  it("gagal catat cycle_count_checked TIDAK membatalkan simpan stok opname", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    upsertBuilder.upsert = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "cycle count fail" } });
    supabaseMock.from.mockReturnValue(upsertBuilder);
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await saveStokOpname({ changed: { r1: { gudang: 10 } }, stokRows, products });

    expect(result).toEqual({ count: 1 });
    spy.mockRestore();
  });

  it("logHistory dipanggil per kode unik yang berubah (fire-and-forget, tidak tunggu)", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);
    logHistoryMock.mockResolvedValue(undefined);

    await saveStokOpname({
      changed: { r1: { gudang: 10 }, r2: { gudang: 7 } },
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
      products: [],
    });

    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "D-01-OSK" })
    );
  });

  it("melempar error saat upsert gagal", async () => {
    const errBuilder = makeBuilder({ data: null, error: new Error("upsert fail") });
    supabaseMock.from.mockReturnValue(errBuilder);

    await expect(saveStokOpname({ changed: { r1: { gudang: 1 } }, stokRows, products })).rejects.toThrow("upsert fail");
  });


  it("baris placeholder (id sintetik): upsert TANPA kolom id (biar Supabase generate uuid baru)", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const newId = syntheticStokId("D-33-POL", "Midi", "HITAM");
    const stokRowsWithPlaceholder = [
      ...stokRows,
      { id: newId, kode: "D-33-POL", size: "Midi", warna: "HITAM", gudang: 0, cideng: 0, tegalgubug: 0 },
    ];

    const result = await saveStokOpname({
      changed: { [newId]: { gudang: 7 } },
      stokRows: stokRowsWithPlaceholder,
      products: [...products, { kode: "D-33-POL", nama: "Polkadot" }],
    });

    expect(result).toEqual({ count: 1 });
    const [upsertedRows] = upsertBuilder.upsert.mock.calls[0];
    expect(upsertedRows).toHaveLength(1);
    expect(upsertedRows[0].id).toBeUndefined();
    expect(upsertedRows[0]).toMatchObject({ kode: "D-33-POL", size: "Midi", warna: "HITAM", gudang: 7, cideng: 0, tegalgubug: 0 });
  });

  it("baris placeholder: before dianggap 0 di semua lokasi utk riwayat", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);
    logHistoryMock.mockResolvedValue(undefined);

    const newId = syntheticStokId("D-33-POL", "Gamis", "_");
    const stokRowsWithPlaceholder = [
      ...stokRows,
      { id: newId, kode: "D-33-POL", size: "Gamis", warna: "_", gudang: 0, cideng: 0, tegalgubug: 0 },
    ];

    await saveStokOpname({
      changed: { [newId]: { gudang: 12 } },
      stokRows: stokRowsWithPlaceholder,
      products: [...products, { kode: "D-33-POL", nama: "Polkadot" }],
    });

    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kode: "D-33-POL",
        snapshot: { rows: [{ kode: "D-33-POL", size: "Gamis", warna: "_", gudang: 12, cideng: 0, tegalgubug: 0, ngorder: 0 }] },
        before: { rows: [{ kode: "D-33-POL", size: "Gamis", warna: "_", gudang: 0, cideng: 0, tegalgubug: 0, ngorder: 0 }] },
      })
    );
  });

  it("BUG FIX 2026-09: batch campuran (baris lama + baris placeholder baru) dikirim di 2 request terpisah, bukan 1 array campuran — cegah 'null value in column id'", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const newId = syntheticStokId("D-33-POL", "Midi", "HITAM");
    const stokRowsWithPlaceholder = [
      ...stokRows,
      { id: newId, kode: "D-33-POL", size: "Midi", warna: "HITAM", gudang: 0, cideng: 0, tegalgubug: 0 },
    ];

    const result = await saveStokOpname({
      changed: {
        r1: { gudang: 10 },
        [newId]: { gudang: 7 },
      },
      stokRows: stokRowsWithPlaceholder,
      products: [...products, { kode: "D-33-POL", nama: "Polkadot" }],
    });

    expect(result).toEqual({ count: 2 });
    // 3 panggilan upsert: batch stok_warna lama, batch stok_warna baru, lalu
    // batch cycle_count_checked (tanda kode+lokasi baru saja dihitung --
    // lihat utils.js computeDueList).
    expect(upsertBuilder.upsert).toHaveBeenCalledTimes(3);

    const [existingBatch] = upsertBuilder.upsert.mock.calls[0];
    const [newBatch] = upsertBuilder.upsert.mock.calls[1];

    expect(existingBatch).toHaveLength(1);
    expect(existingBatch[0]).toMatchObject({ id: "r1", gudang: 10 });

    expect(newBatch).toHaveLength(1);
    expect("id" in newBatch[0]).toBe(false);
    expect(newBatch[0]).toMatchObject({ kode: "D-33-POL", size: "Midi", warna: "HITAM", gudang: 7 });
  });

  it("baris placeholder: tetap bisa disimpan walau caller lupa sertakan row-nya di stokRows (fallback decode dari id)", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const newId = syntheticStokId("D-40-ABC", "Midi Jumbo", "BIRU");
    const result = await saveStokOpname({
      changed: { [newId]: { cideng: 4 } },
      stokRows,
      products,
    });

    expect(result).toEqual({ count: 1 });
    const [upsertedRows] = upsertBuilder.upsert.mock.calls[0];
    expect(upsertedRows[0]).toMatchObject({ kode: "D-40-ABC", size: "Midi Jumbo", warna: "BIRU", gudang: 0, cideng: 4, tegalgubug: 0 });
    expect(upsertedRows[0].id).toBeUndefined();
  });
});

describe("fetchJahitDikerjakan", () => {
  it("mengembalikan semua baris dari view v_jahit_dikerjakan", async () => {
    const rows = [
      { kode: "D-01-OSK", size: "Midi", total_dikerjakan: 12 },
      { kode: "D-02-OSK", size: "Gamis", total_dikerjakan: 5 },
    ];
    supabaseMock.from.mockReturnValue(makeBuilder({ data: rows, error: null }));

    expect(await fetchJahitDikerjakan()).toBe(rows);
    expect(supabaseMock.from).toHaveBeenCalledWith("v_jahit_dikerjakan");
  });

  it("mengembalikan [] saat data null", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await fetchJahitDikerjakan()).toEqual([]);
  });

  it("melempar error saat query gagal", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: new Error("view error") }));
    await expect(fetchJahitDikerjakan()).rejects.toThrow("view error");
  });
});

describe("fetchCycleCountChecked", () => {
  it("mengembalikan semua baris cycle_count_checked", async () => {
    const rows = [{ kode: "D-01", location: "gudang", checked_at: "2026-01-01T00:00:00Z" }];
    supabaseMock.from.mockReturnValue(makeBuilder({ data: rows, error: null }));

    expect(await fetchCycleCountChecked()).toBe(rows);
    expect(supabaseMock.from).toHaveBeenCalledWith("cycle_count_checked");
  });

  it("mengembalikan [] saat data null", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await fetchCycleCountChecked()).toEqual([]);
  });

  it("melempar error saat query gagal", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: new Error("checked error") }));
    await expect(fetchCycleCountChecked()).rejects.toThrow("checked error");
  });
});

describe("fetchCycleCountKategori", () => {
  it("memanggil RPC get_cycle_count_kategori dengan p_days", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { "D-01": "A" }, error: null });

    const result = await fetchCycleCountKategori(60);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_cycle_count_kategori", { p_days: 60 });
    expect(result).toEqual({ "D-01": "A" });
  });

  it("default 90 hari kalau tidak diisi", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: {}, error: null });
    await fetchCycleCountKategori();
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_cycle_count_kategori", { p_days: 90 });
  });

  it("mengembalikan {} saat data null", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });
    expect(await fetchCycleCountKategori()).toEqual({});
  });

  it("melempar error saat RPC gagal", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: new Error("rpc error") });
    await expect(fetchCycleCountKategori()).rejects.toThrow("rpc error");
  });
});

describe("planOpnameOverflow (hitungan di backend)", () => {
  it("memanggil RPC plan_opname_overflow", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { overflow: true, sizes: [{ size: "Midi" }] }, error: null });
    const changes = [{ size: "Midi", warna: "HITAM", next: 4 }];
    await expect(planOpnameOverflow({ kode: "K", loc: "cideng", changes })).resolves.toEqual({ overflow: true, sizes: [{ size: "Midi" }] });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("plan_opname_overflow", { p_kode: "K", p_loc: "cideng", p_changes: changes });
  });
  it("tanpa perubahan: tidak memanggil RPC", async () => {
    await expect(planOpnameOverflow({ kode: "K", loc: "cideng", changes: [] })).resolves.toEqual({ overflow: false, sizes: [] });
  });
  it("throws saat error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(planOpnameOverflow({ kode: "K", loc: "cideng", changes: [{ size: "M", warna: "A", next: 1 }] })).rejects.toThrow("x");
  });
});
