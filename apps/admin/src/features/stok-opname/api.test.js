import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchAllStokWarna, saveStokOpname, fetchJahitDikerjakan, planOpnameOverflow } =
  await import("./api");
const { syntheticStokId } = await import("./utils");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
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
  // Upsert stok_warna + audit log sekarang 1 RPC atomik lewat Edge
  // Function stok-opname-crud -> save_stok_opname (sudah diverifikasi
  // langsung di DB saat nulis migrationnya — ON CONFLICT (kode,size,warna),
  // BUKAN id, jadi baris lama+baru campur aman dalam 1 batch; alasan "2
  // request terpisah" versi JS lama sudah gak relevan lagi, lihat
  // supabase/migrations/20261120_save_stok_opname.sql). Test di sini fokus
  // ke logika yang TETAP di JS: merge changed+existing jadi before/after,
  // fallback 0, decode id sintetik — lalu bentuk payload yang dikirim.
  const stokRows = [
    {
      id: "r1",
      kode: "D-01-OSK",
      size: "Midi",
      warna: "HITAM",
      gudang: 3,
      cideng: 2,
      tegalgubug: 1,
    },
    {
      id: "r2",
      kode: "D-01-OSK",
      size: "Gamis",
      warna: "MERAH",
      gudang: 5,
      cideng: 0,
      tegalgubug: 0,
    },
    { id: "r3", kode: "D-02-OSK", size: "Midi", warna: "_", gudang: 10, cideng: 5, tegalgubug: 2 },
  ];

  it("mengembalikan count=0 saat changed kosong (early return)", async () => {
    const result = await saveStokOpname({ changed: {}, stokRows });
    expect(result).toEqual({ count: 0 });
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });

  it("kirim action 'save' dengan rows hasil merge changed+existing, mengembalikan count", async () => {
    const result = await saveStokOpname({
      changed: {
        r1: { gudang: 10 },
        r3: { cideng: 8, tegalgubug: 3 },
      },
      stokRows,
    });

    expect(result).toEqual({ count: 2 });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("stok-opname-crud", {
      body: {
        action: "save",
        input: {
          rows: expect.arrayContaining([
            expect.objectContaining({
              kode: "D-01-OSK",
              size: "Midi",
              warna: "HITAM",
              after: { gudang: 10, cideng: 2, tegalgubug: 1, ngorder: 0 },
            }),
            expect.objectContaining({
              kode: "D-02-OSK",
              size: "Midi",
              warna: "_",
              after: { gudang: 10, cideng: 8, tegalgubug: 3, ngorder: 0 },
            }),
          ]),
        },
      },
    });
  });

  // BUG FIX (November 2026, laporan admin: "saya input ngorder stock opname
  // tapi tidak bertambah sama sekali... ga ada errornya ini, tapi stoknya ga
  // bertambah") — merged value di sini SEMPAT cuma hardcode
  // gudang/cideng/tegalgubug, jadi vals.ngorder yang diketik admin tidak
  // pernah ikut terkirim.
  it("payload ikut mengirim ngorder yang berubah (bukan cuma gudang/cideng/tegalgubug)", async () => {
    await saveStokOpname({ changed: { r1: { ngorder: 7 } }, stokRows });

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "stok-opname-crud",
      expect.objectContaining({
        body: expect.objectContaining({
          input: {
            rows: expect.arrayContaining([
              expect.objectContaining({
                after: { gudang: 3, cideng: 2, tegalgubug: 1, ngorder: 7 },
              }),
            ]),
          },
        }),
      }),
    );
  });

  it("baris tanpa ngorder sebelumnya (undefined) fallback ke 0, bukan dibiarkan tak terkirim", async () => {
    await saveStokOpname({ changed: { r2: { gudang: 6 } }, stokRows });

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "stok-opname-crud",
      expect.objectContaining({
        body: expect.objectContaining({
          input: {
            rows: expect.arrayContaining([
              expect.objectContaining({
                kode: "D-01-OSK",
                size: "Gamis",
                after: expect.objectContaining({ gudang: 6, ngorder: 0 }),
              }),
            ]),
          },
        }),
      }),
    );
  });

  it("Edge Function balikin error di level network -> melempar error", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error("network gagal"),
    });

    await expect(saveStokOpname({ changed: { r1: { gudang: 1 } }, stokRows })).rejects.toThrow(
      "network gagal",
    );
  });

  it("Edge Function balikin {error} di body -> melempar error dgn pesannya", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: { error: "upsert fail" },
      error: null,
    });

    await expect(saveStokOpname({ changed: { r1: { gudang: 1 } }, stokRows })).rejects.toThrow(
      "upsert fail",
    );
  });

  it("baris placeholder (id sintetik): payload tanpa kolom id, kode/size/warna didecode dari id", async () => {
    const newId = syntheticStokId("D-33-POL", "Midi", "HITAM");
    const stokRowsWithPlaceholder = [
      ...stokRows,
      {
        id: newId,
        kode: "D-33-POL",
        size: "Midi",
        warna: "HITAM",
        gudang: 0,
        cideng: 0,
        tegalgubug: 0,
      },
    ];

    const result = await saveStokOpname({
      changed: { [newId]: { gudang: 7 } },
      stokRows: stokRowsWithPlaceholder,
    });

    expect(result).toEqual({ count: 1 });
    const { rows } = supabaseMock.functions.invoke.mock.calls[0][1].body.input;
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("id");
    expect(rows[0]).toMatchObject({
      kode: "D-33-POL",
      size: "Midi",
      warna: "HITAM",
      after: { gudang: 7, cideng: 0, tegalgubug: 0, ngorder: 0 },
    });
  });

  it("baris placeholder: before dianggap 0 di semua lokasi", async () => {
    const newId = syntheticStokId("D-33-POL", "Gamis", "_");
    const stokRowsWithPlaceholder = [
      ...stokRows,
      {
        id: newId,
        kode: "D-33-POL",
        size: "Gamis",
        warna: "_",
        gudang: 0,
        cideng: 0,
        tegalgubug: 0,
      },
    ];

    await saveStokOpname({
      changed: { [newId]: { gudang: 12 } },
      stokRows: stokRowsWithPlaceholder,
    });

    const { rows } = supabaseMock.functions.invoke.mock.calls[0][1].body.input;
    expect(rows[0].before).toEqual({ gudang: 0, cideng: 0, tegalgubug: 0, ngorder: 0 });
    expect(rows[0].after).toEqual({ gudang: 12, cideng: 0, tegalgubug: 0, ngorder: 0 });
  });

  it("batch campuran (baris lama + baris placeholder baru) tetap 1 request, bukan 2 lagi", async () => {
    const newId = syntheticStokId("D-33-POL", "Midi", "HITAM");
    const stokRowsWithPlaceholder = [
      ...stokRows,
      {
        id: newId,
        kode: "D-33-POL",
        size: "Midi",
        warna: "HITAM",
        gudang: 0,
        cideng: 0,
        tegalgubug: 0,
      },
    ];

    const result = await saveStokOpname({
      changed: { r1: { gudang: 10 }, [newId]: { gudang: 7 } },
      stokRows: stokRowsWithPlaceholder,
    });

    expect(result).toEqual({ count: 2 });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1);
    const { rows } = supabaseMock.functions.invoke.mock.calls[0][1].body.input;
    expect(rows).toHaveLength(2);
  });

  it("baris placeholder: tetap bisa disimpan walau caller lupa sertakan row-nya di stokRows (fallback decode dari id)", async () => {
    const newId = syntheticStokId("D-40-ABC", "Midi Jumbo", "BIRU");
    const result = await saveStokOpname({ changed: { [newId]: { cideng: 4 } }, stokRows });

    expect(result).toEqual({ count: 1 });
    const { rows } = supabaseMock.functions.invoke.mock.calls[0][1].body.input;
    expect(rows[0]).toMatchObject({
      kode: "D-40-ABC",
      size: "Midi Jumbo",
      warna: "BIRU",
      after: { gudang: 0, cideng: 4, tegalgubug: 0, ngorder: 0 },
    });
    expect(rows[0]).not.toHaveProperty("id");
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

describe("planOpnameOverflow (hitungan di backend)", () => {
  it("memanggil RPC plan_opname_overflow", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { overflow: true, sizes: [{ size: "Midi" }] },
      error: null,
    });
    const changes = [{ size: "Midi", warna: "HITAM", next: 4 }];
    await expect(planOpnameOverflow({ kode: "K", loc: "cideng", changes })).resolves.toEqual({
      overflow: true,
      sizes: [{ size: "Midi" }],
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("plan_opname_overflow", {
      p_kode: "K",
      p_loc: "cideng",
      p_changes: changes,
    });
  });
  it("tanpa perubahan: tidak memanggil RPC", async () => {
    await expect(planOpnameOverflow({ kode: "K", loc: "cideng", changes: [] })).resolves.toEqual({
      overflow: false,
      sizes: [],
    });
  });
  it("throws saat error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(
      planOpnameOverflow({
        kode: "K",
        loc: "cideng",
        changes: [{ size: "M", warna: "A", next: 1 }],
      }),
    ).rejects.toThrow("x");
  });
});
