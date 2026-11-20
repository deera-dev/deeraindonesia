import { beforeEach, describe, expect, it, vi } from "vitest";
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

const {
  fetchStokMap,
  fetchStokWarnaByKode,
  fetchProducedByKode,
  fetchProductBadges,
  fetchProductBadgeHistory,
  fetchProductBadgeReason,
  fetchProductAchievements,
  fetchProductPriceHistory,
  saveProduct,
  deleteProductCascade,
} = await import("./api");

function setupFromMock(buildersByTable) {
  supabaseMock.from.mockImplementation((table) => buildersByTable[table] ?? makeBuilder());
}

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  uploadMediaMock.mockReset();
});

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

  it("membangun map size->warna->stok dari data, termasuk ngorder", async () => {
    const rows = [
      { size: "Midi", warna: "HITAM", gudang: 1, cideng: 2, tegalgubug: 3, ngorder: 1 },
      { size: "Midi", warna: "MERAH", gudang: 4, cideng: 5, tegalgubug: 6, ngorder: 0 },
    ];
    const builder = makeBuilder({ data: rows, error: null });
    setupFromMock({ stok_warna: builder });

    const map = await fetchStokWarnaByKode("D-01-OSK");

    expect(builder.select).toHaveBeenCalledWith(expect.stringContaining("ngorder"));
    expect(builder.eq).toHaveBeenCalledWith("kode", "D-01-OSK");
    expect(map.Midi.HITAM).toEqual({ gudang: 1, cideng: 2, tegalgubug: 3, ngorder: 1 });
    expect(map.Midi.MERAH).toEqual({ gudang: 4, cideng: 5, tegalgubug: 6, ngorder: 0 });
  });
});

describe("fetchProducedByKode", () => {
  it("mengembalikan {} saat data null", async () => {
    setupFromMock({ produksi_batch: makeBuilder({ data: null, error: null }) });
    expect(await fetchProducedByKode("D-01-OSK")).toEqual({});
  });

  it("mengembalikan {} saat supabase mengembalikan error", async () => {
    setupFromMock({
      produksi_batch: makeBuilder({ data: null, error: new Error("boom") }),
    });
    expect(await fetchProducedByKode("D-01-OSK")).toEqual({});
  });

  it("filter berdasar kode_produk", async () => {
    const builder = makeBuilder({ data: [], error: null });
    setupFromMock({ produksi_batch: builder });

    await fetchProducedByKode("D-01-OSK");

    expect(builder.eq).toHaveBeenCalledWith("kode_produk", "D-01-OSK");
  });

  it("menjumlahkan qty lintas warna DALAM 1 size pada 1 batch", async () => {
    const rows = [
      {
        sizes: [
          {
            size: "Midi",
            warna: [
              { warna: "HITAM", qty: 5 },
              { warna: "MERAH", qty: 3 },
            ],
          },
        ],
      },
    ];
    setupFromMock({ produksi_batch: makeBuilder({ data: rows, error: null }) });

    const map = await fetchProducedByKode("D-01-OSK");

    expect(map).toEqual({ Midi: 8 });
  });

  it("menjumlahkan qty utk size YANG SAMA lintas BEBERAPA batch (bukan cuma batch terakhir)", async () => {
    const rows = [
      { sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 10 }] }] },
      { sizes: [{ size: "Midi", warna: [{ warna: "BIRU", qty: 4 }] }] },
      { sizes: [{ size: "Gamis Jumbo", warna: [{ warna: "_", qty: 7 }] }] },
    ];
    setupFromMock({ produksi_batch: makeBuilder({ data: rows, error: null }) });

    const map = await fetchProducedByKode("D-01-OSK");

    expect(map).toEqual({ Midi: 14, "Gamis Jumbo": 7 });
  });

  it("mengabaikan entry size tanpa nama (size falsy) & batch tanpa field sizes", async () => {
    const rows = [
      { sizes: [{ size: "", warna: [{ warna: "HITAM", qty: 99 }] }] },
      { sizes: null },
      {},
      { sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 2 }] }] },
    ];
    setupFromMock({ produksi_batch: makeBuilder({ data: rows, error: null }) });

    const map = await fetchProducedByKode("D-01-OSK");

    expect(map).toEqual({ Midi: 2 });
  });
});

describe("saveProduct", () => {
  // Tulis-DB (products/stok_warna/product_history/rename warna) sekarang
  // atomik lewat Edge Function produk-crud -> RPC save_product (lihat
  // supabase/migrations/20261120_save_product_delete_product_cascade.sql
  // utk test SQL-nya langsung: insert/edit/rename/orphan-cleanup/guard "_"
  // semua sudah diverifikasi di level RPC). Test di sini fokus ke logika
  // yang TETAP di JS: upload media & bentuk payload yang dikirim.
  it("insert produk baru (mainImage/detail bertipe url) -> kirim action 'save' dgn payload yg benar, tanpa upload", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: { data: { kode: "D-50-OSK" } },
      error: null,
    });

    await saveProduct({
      isEdit: false,
      originalKode: undefined,
      finalKode: "D-50-OSK",
      fields: { nama: "Gamis Aisyah", bahan: "Ceruti", hpp: "75.000" },
      mainImage: { type: "url", url: "main.jpg" },
      detailImages: [{ type: "url", url: "d1.jpg" }],
      warna: ["HITAM", "MERAH"],
      activeSet: new Set(["Midi", "Gamis"]),
      hargaMap: { Midi: "150000", Gamis: "180000" },
    });

    expect(uploadMediaMock).not.toHaveBeenCalled();
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("produk-crud", {
      body: {
        action: "save",
        input: expect.objectContaining({
          isEdit: false,
          originalKode: null,
          finalKode: "D-50-OSK",
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
          warnaRenames: [],
        }),
      },
    });
  });

  it("seri_warna: null saat seriWarnaImage tidak diberikan (undefined)", async () => {
    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-51-OSK",
      fields: { nama: "Gamis Tanpa Seri Warna", bahan: "Ceruti", hpp: "50000" },
      mainImage: null,
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "100000" },
    });

    expect(result.seri_warna).toBeNull();
    expect(uploadMediaMock).not.toHaveBeenCalled();
  });

  it("seri_warna: memakai URL langsung saat seriWarnaImage bertipe url (tanpa upload)", async () => {
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
    });

    expect(result.seri_warna).toBe("seri-warna-existing.jpg");
    expect(uploadMediaMock).not.toHaveBeenCalled();
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "produk-crud",
      expect.objectContaining({
        body: expect.objectContaining({
          input: expect.objectContaining({ seriWarna: "seri-warna-existing.jpg" }),
        }),
      }),
    );
  });

  it("seri_warna: upload file ke Cloudinary saat seriWarnaImage bertipe file", async () => {
    uploadMediaMock.mockResolvedValue({ url: "seri-warna-uploaded.jpg" });

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
    });

    expect(uploadMediaMock).toHaveBeenCalledWith({ name: "seri.png" }, { kind: "image" });
    expect(result.seri_warna).toBe("seri-warna-uploaded.jpg");
  });

  it("insert produk baru: upload file utk mainImage & detailImages, fallback harga kosong & hpp tidak valid, warna kosong -> []", async () => {
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
  });

  it("update produk (isEdit=true) -> isEdit/originalKode/warnaRenames diteruskan apa adanya ke Edge Function", async () => {
    await saveProduct({
      isEdit: true,
      originalKode: "D-10-OSK",
      finalKode: "D-10-OSK",
      fields: { nama: "New Name", bahan: "Bahan", hpp: "100000" },
      mainImage: null,
      detailImages: [],
      warna: ["HITAM"],
      warnaRenames: [{ from: "HITAMLAMA", to: "HITAM" }],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "150000" },
    });

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("produk-crud", {
      body: {
        action: "save",
        input: expect.objectContaining({
          isEdit: true,
          originalKode: "D-10-OSK",
          finalKode: "D-10-OSK",
          warna: ["HITAM"],
          warnaRenames: [{ from: "HITAMLAMA", to: "HITAM" }],
        }),
      },
    });
  });

  it("Edge Function balikin error di level network -> melempar error", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error("network gagal"),
    });

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
      }),
    ).rejects.toThrow("network gagal");
  });

  it("Edge Function balikin {error} di body (RPC melempar exception) -> melempar error dgn pesannya", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: { error: "Nama produk wajib diisi" },
      error: null,
    });

    await expect(
      saveProduct({
        isEdit: false,
        finalKode: "D-71-OSK",
        fields: { nama: "X", bahan: "Y", hpp: "1000" },
        mainImage: null,
        detailImages: [],
        warna: [],
        activeSet: new Set(["Midi"]),
        hargaMap: { Midi: "1000" },
      }),
    ).rejects.toThrow("Nama produk wajib diisi");
  });

  it("upload video saat videoFile bertipe file", async () => {
    uploadMediaMock.mockResolvedValue({ url: "video.mp4" });

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
    });

    expect(uploadMediaMock).toHaveBeenCalledWith({ name: "vid.mp4" }, { kind: "video" });
    expect(result.video).toBe("video.mp4");
  });

  it("simpan video url langsung tanpa upload saat videoFile bertipe url", async () => {
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
    });

    expect(result.video).toBe("https://res.cloudinary.com/x/vid.mp4");
  });

  it("video null saat videoFile tidak diberikan", async () => {
    const result = await saveProduct({
      isEdit: false,
      finalKode: "D-82-OSK",
      fields: { nama: "No Video", bahan: "Ceruti", hpp: "100000" },
      mainImage: null,
      detailImages: [],
      warna: [],
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
    });

    expect(result.video).toBeNull();
  });

  it("default warnaRenames=[] saat tidak diberikan", async () => {
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
    });

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "produk-crud",
      expect.objectContaining({
        body: expect.objectContaining({
          input: expect.objectContaining({ warnaRenames: [] }),
        }),
      }),
    );
  });
});

// RPC mengembalikan per UKURAN -- { [size]: { gudang, cideng, tegalgubug,
// total } } -- admin: "1 kode ada beberapa yang punya lebih dari 1 ukuran,
// jangan digabung, terpisah stoknya". fetchSalesByKode/fetchDikirimByKode
// meneruskan apa adanya, TIDAK menjumlahkan ukuran jadi 1 angka lagi.
describe("fetchSalesByKode", () => {
  it("memanggil rpc('get_sales_summary_by_product', { p_kode }) dengan kode yang benar", async () => {
    const { fetchSalesByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { Midi: { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 } },
      error: null,
    });

    await fetchSalesByKode("D-01-OSK");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_sales_summary_by_product", {
      p_kode: "D-01-OSK",
    });
  });

  it("meneruskan hasil agregasi per ukuran dari RPC apa adanya", async () => {
    const { fetchSalesByKode } = await import("./api");
    const data = {
      Midi: { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 },
      Gamis: { gudang: 1, cideng: 0, tegalgubug: 0, total: 1 },
    };
    supabaseMock.rpc.mockResolvedValueOnce({ data, error: null });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual(data);
  });

  it("data null (tanpa error) -> fallback ke {} (bukan zeros)", async () => {
    const { fetchSalesByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual({});
  });

  it("RPC error -> log console.error & mengembalikan {}, tidak melempar", async () => {
    const { fetchSalesByKode } = await import("./api");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    const result = await fetchSalesByKode("D-01-OSK");

    expect(result).toEqual({});
    expect(errorSpy).toHaveBeenCalledWith("[fetchSalesByKode] error:", expect.any(Error));
    errorSpy.mockRestore();
  });
});

describe("fetchDikirimByKode", () => {
  it("memanggil rpc('get_keep_terkirim_summary_by_product', { p_kode }) dengan kode yang benar", async () => {
    const { fetchDikirimByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { Midi: { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 } },
      error: null,
    });

    await fetchDikirimByKode("D-01-OSK");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_keep_terkirim_summary_by_product", {
      p_kode: "D-01-OSK",
    });
  });

  it("meneruskan hasil agregasi per ukuran dari RPC apa adanya", async () => {
    const { fetchDikirimByKode } = await import("./api");
    const data = {
      Midi: { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 },
      Gamis: { gudang: 1, cideng: 0, tegalgubug: 0, total: 1 },
    };
    supabaseMock.rpc.mockResolvedValueOnce({ data, error: null });

    const result = await fetchDikirimByKode("D-01-OSK");

    expect(result).toEqual(data);
  });

  it("data null (tanpa error) -> fallback ke {} (bukan zeros)", async () => {
    const { fetchDikirimByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchDikirimByKode("D-01-OSK");

    expect(result).toEqual({});
  });

  it("RPC error -> log console.error & mengembalikan {}, tidak melempar", async () => {
    const { fetchDikirimByKode } = await import("./api");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    const result = await fetchDikirimByKode("D-01-OSK");

    expect(result).toEqual({});
    expect(errorSpy).toHaveBeenCalledWith("[fetchDikirimByKode] error:", expect.any(Error));
    errorSpy.mockRestore();
  });
});

describe("fetchSalesDetailByKode", () => {
  it("memanggil rpc('get_sales_detail_by_product', { p_kode }) dengan kode yang benar", async () => {
    const { fetchSalesDetailByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchSalesDetailByKode("D-01-OSK");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_sales_detail_by_product", {
      p_kode: "D-01-OSK",
    });
  });

  it("meneruskan hasil RPC apa adanya sebagai array baris transaksi", async () => {
    const { fetchSalesDetailByKode } = await import("./api");
    const rows = [
      {
        id: "s1",
        created_at: "2026-08-20T10:00:00Z",
        buyer_name: "Alex",
        buyer_hp: "0812",
        location: "gudang",
        qty: 2,
      },
    ];
    supabaseMock.rpc.mockResolvedValueOnce({ data: rows, error: null });

    const result = await fetchSalesDetailByKode("D-01-OSK");

    expect(result).toEqual(rows);
  });

  it("data null (tanpa error) -> fallback ke array kosong", async () => {
    const { fetchSalesDetailByKode } = await import("./api");
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

    expect(await fetchSalesDetailByKode("D-01-OSK")).toEqual([]);
  });

  it("RPC error -> log console.error & mengembalikan array kosong, tidak melempar", async () => {
    const { fetchSalesDetailByKode } = await import("./api");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    const result = await fetchSalesDetailByKode("D-01-OSK");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith("[fetchSalesDetailByKode] error:", expect.any(Error));
    errorSpy.mockRestore();
  });
});

describe("deleteProductCascade", () => {
  // Cascade delete (produksi_batch/expected_stok/hpp_template/stok_warna/
  // products) + audit log sekarang atomik lewat Edge Function produk-crud
  // -> RPC delete_product_cascade (sudah diverifikasi langsung di DB saat
  // nulis migrationnya). Di sini cuma tes JS-nya manggil dgn action/input
  // yang benar & meneruskan error.
  it("mengirim action 'delete' dengan kode yang benar", async () => {
    await deleteProductCascade("D-01-OSK");

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("produk-crud", {
      body: { action: "delete", input: { kode: "D-01-OSK", sumber: null } },
    });
  });

  it("meneruskan sumber kalau diberikan (dipakai produksi-record)", async () => {
    await deleteProductCascade("D-01-OSK", "produksi");

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("produk-crud", {
      body: { action: "delete", input: { kode: "D-01-OSK", sumber: "produksi" } },
    });
  });

  it("Edge Function balikin error di level network -> melempar error", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error("network gagal"),
    });

    await expect(deleteProductCascade("D-02-OSK")).rejects.toThrow("network gagal");
  });

  it("Edge Function balikin {error} di body -> melempar error dgn pesannya", async () => {
    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: { error: "Produk tidak ditemukan" },
      error: null,
    });

    await expect(deleteProductCascade("D-03-OSK")).rejects.toThrow("Produk tidak ditemukan");
  });
});

describe("fetchProductBadges (logika lencana di backend)", () => {
  beforeEach(() => resetSupabaseMock(supabaseMock));

  it("memanggil RPC get_product_badges dengan p_days dan mengembalikan peta kode->lencana", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { "D-01": "terlaris" }, error: null });
    await expect(fetchProductBadges(30)).resolves.toEqual({ "D-01": "terlaris" });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("refresh_product_badges", { p_days: 30 });
  });

  it("default p_days 30 hari", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: {}, error: null });
    await fetchProductBadges();
    expect(supabaseMock.rpc).toHaveBeenCalledWith("refresh_product_badges", { p_days: 30 });
  });

  it("fetchProductBadgeHistory memanggil RPC riwayat", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: [{ badge: "terlaris" }], error: null });
    await expect(fetchProductBadgeHistory("D-01")).resolves.toEqual([{ badge: "terlaris" }]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_product_badge_history", { p_kode: "D-01" });
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(fetchProductBadgeHistory("D-01")).resolves.toEqual([]);
  });

  it("error / data kosong -> {}", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(fetchProductBadges()).resolves.toEqual({});
  });
});

describe("fetchProductBadgeReason", () => {
  beforeEach(() => resetSupabaseMock(supabaseMock));
  it("mengembalikan baris pertama RPC, null jika kosong/error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ badge: "terlaris", reason: "x" }],
      error: null,
    });
    await expect(fetchProductBadgeReason("D-01")).resolves.toEqual({
      badge: "terlaris",
      reason: "x",
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_product_badge_reason", {
      p_kode: "D-01",
      p_days: 30,
    });
    supabaseMock.rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchProductBadgeReason("D-01")).resolves.toBeNull();
  });
});

describe("fetchProductAchievements", () => {
  beforeEach(() => resetSupabaseMock(supabaseMock));
  it("memanggil RPC pencapaian, [] jika error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ badge: "terlaris", label: "Februari 2026" }],
      error: null,
    });
    await expect(fetchProductAchievements("D-01")).resolves.toEqual([
      { badge: "terlaris", label: "Februari 2026" },
    ]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_product_achievements", { p_kode: "D-01" });
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(fetchProductAchievements("D-01")).resolves.toEqual([]);
  });
});

describe("fetchProductPriceHistory", () => {
  beforeEach(() => resetSupabaseMock(supabaseMock));
  it("memanggil RPC riwayat perubahan, [] jika error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ action: "edit", changes: [] }],
      error: null,
    });
    await expect(fetchProductPriceHistory("D-01")).resolves.toEqual([
      { action: "edit", changes: [] },
    ]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_product_price_history", { p_kode: "D-01" });
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(fetchProductPriceHistory("D-01")).resolves.toEqual([]);
  });
});
