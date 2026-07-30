import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const uploadMediaMock = vi.fn();
vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: (...args) => uploadMediaMock(...args),
}));

const logHistoryMock = vi.fn();
vi.mock("../history/api", () => ({
  logHistory: (...args) => logHistoryMock(...args),
}));

const { fetchStokMap, fetchStokWarnaByKode, saveProduct, deleteProductCascade } = await import(
  "./api"
);

function setupFromMock(buildersByTable) {
  supabaseMock.from.mockImplementation((table) => buildersByTable[table] ?? makeBuilder());
}

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  uploadMediaMock.mockReset();
  logHistoryMock.mockReset();
});

// fetchStokMap sekarang memanggil RPC Postgres `get_stock_summary`
// (Migration Phase 1) — GROUP BY kode/kode+size dan SUM per lokasi
// dilakukan di database, RPC mengembalikan object map yang SUDAH
// berbentuk final (tidak ada lagi loop aggregate di JS). Test di sini
// fokus pada kontrak pemanggilan RPC: parameter (tidak ada), hasil
// diteruskan apa adanya, dan fallback ke {} saat error/data null — sama
// seperti kontrak fungsi lama.
describe("fetchStokMap", () => {
  it("memanggil rpc('get_stock_summary') tanpa parameter", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: {}, error: null });

    await fetchStokMap();

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_stock_summary");
  });

  it("mengembalikan {} saat supabase mengembalikan error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    expect(await fetchStokMap()).toEqual({});
  });

  it("mengembalikan {} saat data null (tanpa error)", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchStokMap()).toEqual({});
  });

  it("meneruskan hasil agregasi dari RPC apa adanya (map per kode & per size)", async () => {
    const rpcResult = {
      A: {
        gudang: 6,
        cideng: 4,
        tegalgubug: 3,
        sizes: {
          Midi: { gudang: 5, cideng: 3, tegalgubug: 2 },
          Gamis: { gudang: 1, cideng: 1, tegalgubug: 1 },
        },
      },
    };
    supabaseMock.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const map = await fetchStokMap();

    expect(map).toEqual(rpcResult);
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
    expect(uploadMediaMock).not.toHaveBeenCalled();
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

  it("seri_warna: null saat seriWarnaImage tidak diberikan (undefined)", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-51-OSK",
      fields: { nama: "Gamis Tanpa Seri Warna", bahan: "Ceruti", hpp: "50000" },
      mainImage: null,
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "100000" },
      stokWarnaMap: {},
    });

    expect(result.seri_warna).toBeNull();
    expect(uploadMediaMock).not.toHaveBeenCalled();
  });

  it("seri_warna: memakai URL langsung saat seriWarnaImage bertipe url (tanpa upload)", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-52-OSK",
      fields: { nama: "Gamis Seri Warna URL", bahan: "Ceruti", hpp: "50000" },
      mainImage: null,
      seriWarnaImage: { type: "url", url: "seri-warna-existing.jpg" },
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "100000" },
      stokWarnaMap: {},
    });

    expect(result.seri_warna).toBe("seri-warna-existing.jpg");
    expect(uploadMediaMock).not.toHaveBeenCalled();
    expect(productsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ seri_warna: "seri-warna-existing.jpg" }),
    );
  });

  it("seri_warna: upload file ke Cloudinary saat seriWarnaImage bertipe file", async () => {
    uploadMediaMock.mockResolvedValue({ url: "seri-warna-uploaded.jpg" });
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-53-OSK",
      fields: { nama: "Gamis Seri Warna File", bahan: "Ceruti", hpp: "50000" },
      mainImage: null,
      seriWarnaImage: { type: "file", file: { name: "seri.png" } },
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "100000" },
      stokWarnaMap: {},
    });

    expect(uploadMediaMock).toHaveBeenCalledWith({ name: "seri.png" }, { kind: "image" });
    expect(result.seri_warna).toBe("seri-warna-uploaded.jpg");
  });

  it("insert produk baru: upload file utk mainImage & detailImages, fallback harga kosong & hpp tidak valid, warna kosong -> ['_']", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });
    uploadMediaMock.mockResolvedValue({ url: "uploaded.jpg" });

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

    expect(uploadMediaMock).toHaveBeenCalledWith({ name: "main.png" }, { kind: "image" });
    expect(uploadMediaMock).toHaveBeenCalledWith({ name: "d1.png" }, { kind: "image" });
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
        hargaMap: { Midi: "100000" },
        stokWarnaMap: {},
      }),
    ).rejects.toThrow("stok gagal");
  });

  it("upload video saat videoFile bertipe file", async () => {
    uploadMediaMock.mockResolvedValue({ url: "video.mp4" });
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-80-OSK",
      fields: { nama: "Video Produk", bahan: "Ceruti", hpp: "100000" },
      mainImage: null,
      videoFile: { type: "file", file: { name: "vid.mp4" } },
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
      stokWarnaMap: {},
    });

    expect(uploadMediaMock).toHaveBeenCalledWith({ name: "vid.mp4" }, { kind: "video" });
    expect(result.video).toBe("video.mp4");
  });

  it("simpan video url langsung tanpa upload saat videoFile bertipe url", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-81-OSK",
      fields: { nama: "Video URL Produk", bahan: "Ceruti", hpp: "100000" },
      mainImage: null,
      videoFile: { type: "url", url: "https://res.cloudinary.com/x/vid.mp4" },
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
      stokWarnaMap: {},
    });

    expect(result.video).toBe("https://res.cloudinary.com/x/vid.mp4");
  });

  it("video null saat videoFile tidak diberikan", async () => {
    const productsBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-82-OSK",
      fields: { nama: "No Video", bahan: "Ceruti", hpp: "100000" },
      mainImage: null,
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
      stokWarnaMap: {},
    });

    expect(result.video).toBeNull();
  });

  describe("warnaRenames (rename warna ditunda sampai Simpan)", () => {
    it("memanggil RPC rename_produk_warna dengan originalKode+from+to & tidak insert stok_warna duplikat", async () => {
      const productsBuilder = makeBuilder({ data: null, error: null });
      const stokWarnaBuilder = makeBuilder({ data: null, error: null });
      setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });
      supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

      await saveProduct({
        isEdit: true,
        originalKode: "D-90-OSK",
        finalKode: "D-90-OSK",
        fields: { nama: "Produk Rename", bahan: "Ceruti", hpp: "100000" },
        mainImage: null,
        detailImages: [],
        warna: ["NAVY"],
        warnaRenames: [{ from: "HITAM", to: "NAVY" }],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "150000" },
        stokWarnaMap: { Midi: { HITAM: { gudang: 3, cideng: 0, tegalgubug: 0 } } },
      });

      expect(supabaseMock.rpc).toHaveBeenCalledWith("rename_produk_warna", {
        p_kode: "D-90-OSK",
        p_old_warna: "HITAM",
        p_new_warna: "NAVY",
      });
      expect(stokWarnaBuilder.insert).not.toHaveBeenCalled();
    });

    it("beberapa entri rename masing-masing memanggil RPC", async () => {
      const productsBuilder = makeBuilder({ data: null, error: null });
      const stokWarnaBuilder = makeBuilder({ data: null, error: null });
      setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });
      supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

      await saveProduct({
        isEdit: true,
        originalKode: "D-91-OSK",
        finalKode: "D-91-OSK",
        fields: { nama: "Produk Multi Rename", bahan: "Ceruti", hpp: "100000" },
        mainImage: null,
        detailImages: [],
        warna: ["NAVY", "MAROON"],
        warnaRenames: [
          { from: "HITAM", to: "NAVY" },
          { from: "MERAH", to: "MAROON" },
        ],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "150000" },
        stokWarnaMap: {
          Midi: {
            HITAM: { gudang: 1, cideng: 0, tegalgubug: 0 },
            MERAH: { gudang: 2, cideng: 0, tegalgubug: 0 },
          },
        },
      });

      expect(supabaseMock.rpc).toHaveBeenCalledWith("rename_produk_warna", {
        p_kode: "D-91-OSK",
        p_old_warna: "HITAM",
        p_new_warna: "NAVY",
      });
      expect(supabaseMock.rpc).toHaveBeenCalledWith("rename_produk_warna", {
        p_kode: "D-91-OSK",
        p_old_warna: "MERAH",
        p_new_warna: "MAROON",
      });
      expect(supabaseMock.rpc).toHaveBeenCalledTimes(2);
    });

    it("RPC rename gagal -> melempar error, tidak lanjut ke insert stok_warna", async () => {
      const productsBuilder = makeBuilder({ data: null, error: null });
      const stokWarnaBuilder = makeBuilder({ data: null, error: null });
      setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });
      const renameErr = new Error("rename gagal");
      supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: renameErr });

      await expect(
        saveProduct({
          isEdit: true,
          originalKode: "D-92-OSK",
          finalKode: "D-92-OSK",
          fields: { nama: "Produk Rename Gagal", bahan: "Ceruti", hpp: "100000" },
          mainImage: null,
          detailImages: [],
          warna: ["NAVY"],
          warnaRenames: [{ from: "HITAM", to: "NAVY" }],
          activeSet: new Set(["Midi"]),
          hargaMap: { Midi: "150000" },
          stokWarnaMap: { Midi: { HITAM: { gudang: 1, cideng: 0, tegalgubug: 0 } } },
        }),
      ).rejects.toThrow("rename gagal");

      expect(stokWarnaBuilder.insert).not.toHaveBeenCalled();
    });

    it("isEdit=false: RPC TIDAK dipanggil meskipun warnaRenames diberikan", async () => {
      const productsBuilder = makeBuilder({ data: null, error: null });
      const stokWarnaBuilder = makeBuilder({ data: null, error: null });
      setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

      await saveProduct({
        isEdit: false,
        finalKode: "D-93-OSK",
        fields: { nama: "Produk Baru", bahan: "Ceruti", hpp: "100000" },
        mainImage: null,
        detailImages: [],
        warna: ["NAVY"],
        warnaRenames: [{ from: "HITAM", to: "NAVY" }],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "150000" },
        stokWarnaMap: {},
      });

      expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rename_produk_warna", expect.anything());
    });

    it("default warnaRenames=[] -> RPC TIDAK dipanggil", async () => {
      const productsBuilder = makeBuilder({ data: null, error: null });
      const stokWarnaBuilder = makeBuilder({ data: null, error: null });
      setupFromMock({ products: productsBuilder, stok_warna: stokWarnaBuilder });

      await saveProduct({
        isEdit: true,
        originalKode: "D-94-OSK",
        finalKode: "D-94-OSK",
        fields: { nama: "Produk Tanpa Rename", bahan: "Ceruti", hpp: "100000" },
        mainImage: null,
        detailImages: [],
        warna: ["HITAM"],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "150000" },
        stokWarnaMap: { Midi: { HITAM: { gudang: 1, cideng: 0, tegalgubug: 0 } } },
      });

      expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rename_produk_warna", expect.anything());
    });
  });
});

// fetchSalesByKode sekarang memanggil RPC Postgres
// `get_sales_summary_by_product` (Migration Phase 1) — agregasi qty flat
// vs warna[].qty per lokasi dilakukan di database, bukan lagi di JS
// setelah menarik seluruh tabel sales. Test di sini fokus pada kontrak
// pemanggilan RPC: parameter yang dikirim benar, hasil RPC diteruskan
// apa adanya, dan kegagalan RPC tetap menghasilkan objek nol (fungsi ini
// TIDAK PERNAH melempar error ke pemanggil, sama seperti versi lama).
describe("fetchSalesByKode", () => {
  it("memanggil rpc('get_sales_summary_by_product', { p_kode }) dengan kode yang benar", async () => {
    const { fetchSalesByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 },
      error: null,
    });

    await fetchSalesByKode("D-01-OSK");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_sales_summary_by_product", {
      p_kode: "D-01-OSK",
    });
  });

  it("meneruskan hasil agregasi dari RPC apa adanya", async () => {
    const { fetchSalesByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 },
      error: null,
    });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual({ gudang: 4, cideng: 2, tegalgubug: 0, total: 6 });
  });

  it("data null (tanpa error) -> fallback ke zeros per field", async () => {
    const { fetchSalesByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual({ gudang: 0, cideng: 0, tegalgubug: 0, total: 0 });
  });

  it("RPC error -> log console.error & mengembalikan zeros, tidak melempar", async () => {
    const { fetchSalesByKode } = await import("./api");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual({ gudang: 0, cideng: 0, tegalgubug: 0, total: 0 });
    expect(errorSpy).toHaveBeenCalledWith("[fetchSalesByKode] error:", expect.any(Error));
    errorSpy.mockRestore();
  });

  it("field parsial dari RPC -> field yang hilang fallback ke 0", async () => {
    const { fetchSalesByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { gudang: 3, total: 3 },
      error: null,
    });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual({ gudang: 3, cideng: 0, tegalgubug: 0, total: 3 });
  });
});

describe("deleteProductCascade", () => {
  it("menghapus semua data terkait dan mencatat audit log hapus", async () => {
    const { deleteProductCascade } = await import("./api");
    const prodBatchBuilder = makeBuilder({ data: null, error: null });
    const expectedStokBuilder = makeBuilder({ data: null, error: null });
    const hppTplBuilder = makeBuilder({ data: null, error: null });
    const stokWarnaBuilder = makeBuilder({ data: null, error: null });
    const productsBuilder = makeBuilder({ data: { kode: "D-01-OSK", nama: "Gamis" }, error: null });

    setupFromMock({
      produksi_batch: prodBatchBuilder,
      expected_stok: expectedStokBuilder,
      hpp_template: hppTplBuilder,
      stok_warna: stokWarnaBuilder,
      products: productsBuilder,
    });

    await deleteProductCascade("D-01-OSK");

    expect(prodBatchBuilder.eq).toHaveBeenCalledWith("kode_produk", "D-01-OSK");
    expect(expectedStokBuilder.eq).toHaveBeenCalledWith("kode", "D-01-OSK");
    expect(hppTplBuilder.eq).toHaveBeenCalledWith("kode_produk", "D-01-OSK");
    expect(stokWarnaBuilder.eq).toHaveBeenCalledWith("kode", "D-01-OSK");
    expect(logHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hapus", category: "produk", kode: "D-01-OSK" }),
    );
  });
});
