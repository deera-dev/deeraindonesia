import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const logHistoryMock = vi.fn();
vi.mock("../history/api", () => ({
  logHistory: (...a) => logHistoryMock(...a),
}));

const { fetchAllStokWarna, saveStokOpname, fetchJahitDikerjakan } = await import("./api");
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

  // ── Baris BARU (id sintetik dari fillMissingStokRows, fix bug 2026-09:
  // "tidak bisa menambahkan stok di produk tertentu ... belum ada data
  // stok untuk produk ini, padahal data warnanya sudah ada juga") ────────

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
    // `id` sengaja ada sbg key dgn value undefined (bukan dihapus dari
    // objek) — JSON.stringify (dipakai supabase-js saat serialize body
    // request) otomatis membuang key bernilai undefined, jadi efeknya di
    // request HTTP asli tetap "tidak mengirim id", walau di level objek JS
    // key-nya masih ada.
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
        snapshot: { rows: [{ kode: "D-33-POL", size: "Gamis", warna: "_", gudang: 12, cideng: 0, tegalgubug: 0 }] },
        before: { rows: [{ kode: "D-33-POL", size: "Gamis", warna: "_", gudang: 0, cideng: 0, tegalgubug: 0 }] },
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
        r1: { gudang: 10 },      // baris lama, punya id asli
        [newId]: { gudang: 7 },  // baris baru/placeholder, tanpa id
      },
      stokRows: stokRowsWithPlaceholder,
      products: [...products, { kode: "D-33-POL", nama: "Polkadot" }],
    });

    expect(result).toEqual({ count: 2 });
    // Harus ada 2 panggilan upsert terpisah (bukan 1 array gabungan) supaya
    // key set tiap request konsisten.
    expect(upsertBuilder.upsert).toHaveBeenCalledTimes(2);

    const [existingBatch] = upsertBuilder.upsert.mock.calls[0];
    const [newBatch] = upsertBuilder.upsert.mock.calls[1];

    // Batch pertama: baris lama, SEMUA objeknya punya key `id`.
    expect(existingBatch).toHaveLength(1);
    expect(existingBatch[0]).toMatchObject({ id: "r1", gudang: 10 });

    // Batch kedua: baris baru, key `id` TIDAK ADA sama sekali di objeknya
    // (bukan cuma undefined) — supaya Postgres pakai default gen_random_uuid()
    // alih-alih dikirim NULL eksplisit.
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
      stokRows, // TIDAK memuat baris placeholder ini sama sekali
      products,
    });

    expect(result).toEqual({ count: 1 });
    const [upsertedRows] = upsertBuilder.upsert.mock.calls[0];
    expect(upsertedRows[0]).toMatchObject({ kode: "D-40-ABC", size: "Midi Jumbo", warna: "BIRU", gudang: 0, cideng: 4, tegalgubug: 0 });
    // `id` sengaja ada sbg key dgn value undefined (bukan dihapus dari
    // objek) — JSON.stringify (dipakai supabase-js saat serialize body
    // request) otomatis membuang key bernilai undefined, jadi efeknya di
    // request HTTP asli tetap "tidak mengirim id", walau di level objek JS
    // key-nya masih ada.
    expect(upsertedRows[0].id).toBeUndefined();
  });
});

describe("fetchJahitDikerjakan", () => {
  it("mengembalikan semua baris dari view v_jahit_dikerjakan", async () => {
    // v_jahit_dikerjakan sekarang di-group per kode+size saja (semua warna
    // digabung) — lihat migration v-jahit-dikerjakan-gabung-warna.sql.
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
