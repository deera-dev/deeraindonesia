import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const uploadImageMock = vi.fn();
vi.mock("@deera/shared/lib/cloudinary", () => ({
  uploadImage: (...args) => uploadImageMock(...args),
}));

const logHistoryMock = vi.fn();
vi.mock("../history/api", () => ({
  logHistory: (...args) => logHistoryMock(...args),
}));

const { fetchStokMap, fetchStokWarnaByKode, saveProduct, deleteProductCascade, fetchSalesByKode } = await import(
  "./api"
);

function setupFromMock(buildersByTable) {
  supabaseMock.from.mockImplementation((table) => buildersByTable[table] ?? makeBuilder());
}

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  uploadImageMock.mockReset();
  logHistoryMock.mockReset();
});

describe("fetchStokMap", () => {
  it("mengembalikan {} saat supabase mengembalikan error", async () => {
    setupFromMock({ stok_warna: makeBuilder({ data: null, error: new Error("boom") }) });
    expect(await fetchStokMap()).toEqual({});
  });

  it("mengembalikan {} saat data null (tanpa error)", async () => {
    setupFromMock({ stok_warna: makeBuilder({ data: null, error: null }) });
    expect(await fetchStokMap()).toEqual({});
  });

  it("mengagregasi stok per kode & per size, fallback null ke 0", async () => {
    const rows = [
      { kode: "A", size: "Midi", gudang: 5, cideng: 3, tegalgubug: 2 },
      { kode: "A", size: "Midi", gudang: null, cideng: null, tegalgubug: null },
      { kode: "A", size: "Gamis", gudang: 1, cideng: 1, tegalgubug: 1 },
    ];
    setupFromMock({ stok_warna: makeBuilder({ data: rows, error: null }) });

    const map = await fetchStokMap();

    expect(map.A.gudang).toBe(6);
    expect(map.A.cideng).toBe(4);
    expect(map.A.tegalgubug).toBe(3);
    expect(map.A.sizes.Midi).toEqual({ gudang: 5, cideng: 3, tegalgubug: 2 });
    expect(map.A.sizes.Gamis).toEqual({ gudang: 1, cideng: 1, tegalgubug: 1 });
  });
});

describe("fetchStokWarnaByKode", () => {
  it("mengembalikan {} saat data null", async () => {
    setupFromMock({ stok_warna: makeBuilder({ data: null, error: null }) });
    expect(await fetchStokWarnaByKode("D-01-OSK")).toEqual({});
  });

  it("membangun map size->warna->stok dari data", async () => {
    const rows = [
      { size: "Midi", warna: "HITAM", gudang: 1, cideng: 2, tegalgubug: 3 },
      { size: "Midi", warna: "MERAH", gudang: 4, cideng: 5, tegalgubug: 6 },
    ];
    const builder = makeBuilder({ data: rows, error: null });
    setupFromMock({ stok_warna: builder });

    const map = await fetchStokWarnaByKode("D-01-OSK");

    expect(builder.eq).toHaveBeenCalledWith("kode", "D-01-OSK");
    expect(map.Midi.HITAM).toEqual({ gudang: 1, cideng: 2, tegalgubug: 3 });
    expect(map.Midi.MERAH).toEqual({ gudang: 4, cideng: 5, tegalgubug: 6 });
  });
});

describe("saveProduct", () => {
  it("insert produk baru (mainImage/detail bertipe url), existingKeys memfilter kombinasi stok yang sudah ada", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      originalKode: undefined,
      finalKode: "D-50-OSK",
      fields: { nama: "Gamis Aisyah", bahan: "Ceruti", hpp: "75.000" },
      mainImage: { type: "url", url: "main.jpg" },
      detailImages: [{ type: "url", url: "d1.jpg" }],
      warna: ["HITAM", "MERAH"],
      activeSet: new Set(["Midi", "Gamis"]),
      hargaMap: { Midi: "150000", Gamis: "180000" },
      stokWarnaMap: { Midi: { HITAM: { gudang: 0, cideng: 0, tegalgubug: 0 } } },
      productBefore: undefined,
    });

    expect(productsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        kode: "D-50-OSK",
        nama: "Gamis Aisyah",
        image: "main.jpg",
        detail: ["d1.jpg"],
        bahan: "Ceruti",
        hpp: 75000,
        warna: ["HITAM", "MERAH"],
        variants: [
          { size: "Midi", ld: 110, pb: 130, harga: 150000 },
          { size: "Gamis", ld: 110, pb: 140, harga: 180000 },
        ],
      }),
    );
    expect(uploadImageMock).not.toHaveBeenCalled();
    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "tambah", category: "produk", kode: "D-50-OSK", snapshot: result }),
    );

    const insertedRows = stokWarnaBuilder.insert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(3);
    expect(insertedRows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ size: "Midi", warna: "HITAM" })]),
    );
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kode: "D-50-OSK", size: "Midi", warna: "MERAH" }),
        expect.objectContaining({ kode: "D-50-OSK", size: "Gamis", warna: "HITAM" }),
        expect.objectContaining({ kode: "D-50-OSK", size: "Gamis", warna: "MERAH" }),
      ]),
    );
  });

  it("insert produk baru: upload file utk mainImage & detailImages, fallback harga kosong & hpp tidak valid, warna kosong -> ['_']", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });
    uploadImageMock.mockResolvedValue({ url: "uploaded.jpg" });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-60-OSK",
      fields: { nama: " Produk X ", bahan: " Katun ", hpp: "abc" },
      mainImage: { type: "file", file: { name: "main.png" } },
      detailImages: [
        { type: "file", file: { name: "d1.png" } },
        { type: "url", url: "d2.jpg" },
      ],
      warna: [],
      activeSet: new Set(["Midi", "Gamis Jumbo"]),
      hargaMap: { Midi: "150000" },
      stokWarnaMap: {},
      productBefore: undefined,
    });

    expect(uploadImageMock).toHaveBeenCalledWith({ name: "main.png" });
    expect(uploadImageMock).toHaveBeenCalledWith({ name: "d1.png" });
    expect(result.image).toBe("uploaded.jpg");
    expect(result.detail).toEqual(["uploaded.jpg", "d2.jpg"]);
    expect(result.nama).toBe("Produk X");
    expect(result.bahan).toBe("Katun");
    expect(result.hpp).toBe(0);
    expect(result.warna).toEqual([]);
    expect(result.variants).toEqual([
      { size: "Midi", ld: 110, pb: 130, harga: 150000 },
      { size: "Gamis Jumbo", ld: 120, pb: 140, harga: 0 },
    ]);

    const insertedRows = stokWarnaBuilder.insert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kode: "D-60-OSK", size: "Midi", warna: "_" }),
        expect.objectContaining({ kode: "D-60-OSK", size: "Gamis Jumbo", warna: "_" }),
      ]),
    );
  });

  it("update produk (isEdit=true): tanpa kombinasi stok baru, hapus orphan warna, mainImage null & tanpa detail", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });
    const productBefore = { kode: "D-10-OSK", nama: "Old" };

    const result = await saveProduct({
      isEdit: true,
      originalKode: "D-10-OSK",
      finalKode: "D-10-OSK",
      fields: { nama: "New Name", bahan: "Bahan", hpp: "100000" },
      mainImage: null,
      detailImages: [],
      warna: ["HITAM"],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "150000" },
      stokWarnaMap: { Midi: { HITAM: {}, MERAH: {} } },
      productBefore,
    });

    expect(result.image).toBeNull();
    expect(result.detail).toEqual([]);
    expect(productsBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ kode: "D-10-OSK" }));
    expect(productsBuilder.eq).toHaveBeenCalledWith("kode", "D-10-OSK");
    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "edit", kode: "D-10-OSK", before: productBefore }),
    );
    expect(stokWarnaBuilder.insert).not.toHaveBeenCalled();
    expect(stokWarnaBuilder.delete).toHaveBeenCalledTimes(1);
    expect(stokWarnaBuilder.eq).toHaveBeenCalledWith("warna", "MERAH");
  });

  it("insert gagal saat simpan products -> melempar error, tidak lanjut ke logHistory/stok_warna", async () => {
    const error = new Error("insert gagal");
    const productsBuilder = makeBuilder({ data: null, error });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    await expect(
      saveProduct({
        isEdit: false,
        finalKode: "D-70-OSK",
        fields: { nama: "X", bahan: "Y", hpp: "1000" },
        mainImage: null,
        detailImages: [],
        warna: [],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "1000" },
        stokWarnaMap: {},
      }),
    ).rejects.toThrow("insert gagal");

    expect(logHistoryMock).not.toHaveBeenCalled();
    expect(stokWarnaBuilder.insert).not.toHaveBeenCalled();
  });

  it("update gagal saat simpan products -> melempar error", async () => {
    const error = new Error("update gagal");
    const productsBuilder = makeBuilder({ data: null, error });
    setupFromMock({ products: productsBuilder, stok_warna: makeBuilder({ data: null, error: null }) });

    await expect(
      saveProduct({
        isEdit: true,
        originalKode: "D-71-OSK",
        finalKode: "D-71-OSK",
        fields: { nama: "X", bahan: "Y", hpp: "1000" },
        mainImage: null,
        detailImages: [],
        warna: [],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "1000" },
        stokWarnaMap: {},
      }),
    ).rejects.toThrow("update gagal");
  });

  it("stok_warna insert gagal -> melempar error", async () => {
    const stokErr = new Error("stok gagal");
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: stokErr });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    await expect(
      saveProduct({
        isEdit: false,
        finalKode: "D-72-OSK",
        fields: { nama: "X", bahan: "Y", hpp: "1000" },
        mainImage: null,
        detailImages: [],
        warna: ["HITAM"],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "1000" },
        stokWarnaMap: {},
      }),
    ).rejects.toThrow("stok gagal");
  });
});

describe("fetchSalesByKode", () => {
  it("mengembalikan {gudang:0,cideng:0,tegalgubug:0,total:0} saat data null", async () => {
    setupFromMock({ sales: makeBuilder({ data: null, error: null }) });
    const result = await fetchSalesByKode("D-07-OSK");
    expect(result).toEqual({ gudang: 0, cideng: 0, tegalgubug: 0, total: 0 });
  });

  it("menjumlahkan qty per lokasi untuk kode yang cocok", async () => {
    const rows = [
      { location: "gudang", items: [{ kode: "D-07-OSK", qty: 3 }, { kode: "D-99-XXX", qty: 10 }] },
      { location: "cideng", items: [{ kode: "D-07-OSK", qty: 2 }] },
      { location: "tegalgubug", items: [{ kode: "D-07-OSK", qty: 1 }] },
    ];
    setupFromMock({ sales: makeBuilder({ data: rows, error: null }) });
    const result = await fetchSalesByKode("D-07-OSK");
    expect(result.gudang).toBe(3);
    expect(result.cideng).toBe(2);
    expect(result.tegalgubug).toBe(1);
    expect(result.total).toBe(6);
  });

  it("mengabaikan lokasi yang tidak dikenal", async () => {
    const rows = [
      { location: "unknown", items: [{ kode: "D-07-OSK", qty: 99 }] },
    ];
    setupFromMock({ sales: makeBuilder({ data: rows, error: null }) });
    const result = await fetchSalesByKode("D-07-OSK");
    expect(result.total).toBe(0);
  });

  it("menjumlahkan qty dari item.warna array (item POS multi-warna, qty=null)", async () => {
    const rows = [
      { location: "gudang", items: [{ kode: "D-07-OSK", qty: null, warna: [{ nama: "HITAM", qty: 3 }, { nama: "MERAH", qty: 2 }] }] },
      { location: "cideng", items: [{ kode: "D-07-OSK", qty: 5 }, { kode: "D-07-OSK", qty: null, warna: [{ nama: "HITAM", qty: 1 }] }] },
    ];
    setupFromMock({ sales: makeBuilder({ data: rows, error: null }) });
    const result = await fetchSalesByKode("D-07-OSK");
    expect(result.gudang).toBe(5);
    expect(result.cideng).toBe(6);
    expect(result.total).toBe(11);
  });

  it("menggunakan .range(0, 9999) agar tidak terpotong limit default Supabase", async () => {
    const salesBuilder = makeBuilder({ data: [], error: null });
    setupFromMock({ sales: salesBuilder });
    await fetchSalesByKode("D-07-OSK");
    expect(salesBuilder.range).toHaveBeenCalledWith(0, 9999);
  });
});
