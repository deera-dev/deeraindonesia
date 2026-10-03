import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const {
  fetchPelangganList,
  fetchSalesByPelanggan,
  searchPelanggan,
  findPelangganByNama,
  createPelanggan,
  updatePelangganInfo,
  fetchPelangganPins,
  fetchPelangganNeedingGeocode,
  setPelangganLocation,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("fetchPelangganList (existing, tidak diubah)", () => {
  it("mengembalikan data pelanggan terurut nama", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "p1" }], error: null }));
    const result = await fetchPelangganList();
    expect(supabaseMock.from).toHaveBeenCalledWith("pelanggan");
    expect(result).toEqual([{ id: "p1" }]);
  });
});

describe("fetchSalesByPelanggan (existing, tidak diubah)", () => {
  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("boom") }));
    await expect(fetchSalesByPelanggan("p1")).rejects.toThrow("boom");
  });
});

// ── Fitur baru: dipakai autocomplete + auto-save penerima Pengiriman ────────

describe("searchPelanggan", () => {
  it("mengembalikan [] tanpa memanggil Supabase saat query kosong/whitespace", async () => {
    expect(await searchPelanggan("")).toEqual([]);
    expect(await searchPelanggan("   ")).toEqual([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("query ke tabel pelanggan dgn ilike nama/no_hp, order nama, limit 8", async () => {
    const builder = makeBuilder({ data: [{ id: "p1", nama: "Budi" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await searchPelanggan("Budi");

    expect(supabaseMock.from).toHaveBeenCalledWith("pelanggan");
    expect(builder.or).toHaveBeenCalledWith("nama.ilike.%Budi%,no_hp.ilike.%Budi%");
    expect(builder.order).toHaveBeenCalledWith("nama");
    expect(builder.limit).toHaveBeenCalledWith(8);
    expect(result).toEqual([{ id: "p1", nama: "Budi" }]);
  });

  it("fallback ke [] saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await searchPelanggan("x")).toEqual([]);
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal") }));
    await expect(searchPelanggan("x")).rejects.toThrow("gagal");
  });
});

describe("findPelangganByNama", () => {
  it("mengembalikan null tanpa query saat nama kosong", async () => {
    expect(await findPelangganByNama("")).toBeNull();
    expect(await findPelangganByNama(null)).toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("query ilike exact-ish nama, limit 1, maybeSingle", async () => {
    const builder = makeBuilder({ data: { id: "p1", nama: "Budi Santoso" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await findPelangganByNama("Budi Santoso");

    expect(builder.ilike).toHaveBeenCalledWith("nama", "Budi Santoso");
    expect(builder.limit).toHaveBeenCalledWith(1);
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual({ id: "p1", nama: "Budi Santoso" });
  });

  it("mengembalikan null saat tidak ketemu (data null)", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await findPelangganByNama("Tidak Ada")).toBeNull();
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal") }));
    await expect(findPelangganByNama("Budi")).rejects.toThrow("gagal");
  });
});

describe("createPelanggan", () => {
  it("melempar error saat nama kosong", async () => {
    await expect(createPelanggan({ nama: "" })).rejects.toThrow("Nama pelanggan wajib diisi.");
    await expect(createPelanggan({ nama: "   " })).rejects.toThrow("Nama pelanggan wajib diisi.");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("insert dengan payload ter-trim & field kosong jadi null", async () => {
    const builder = makeBuilder({ data: { id: "p-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await createPelanggan({ nama: "  Budi  ", no_hp: "", alamat: undefined, ekspedisi_biasa: "  JNE " });

    expect(supabaseMock.from).toHaveBeenCalledWith("pelanggan");
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nama: "Budi",
        no_hp: null,
        alamat: null,
        ekspedisi_biasa: "JNE",
      }),
    );
    expect(result).toEqual({ id: "p-new" });
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal insert") }));
    await expect(createPelanggan({ nama: "Budi" })).rejects.toThrow("gagal insert");
  });
});

describe("updatePelangganInfo", () => {
  it("melempar error saat id kosong", async () => {
    await expect(updatePelangganInfo(null, {})).rejects.toThrow("id pelanggan wajib diisi.");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("hanya menimpa field yang truthy di patch (tidak mengosongkan data lama)", async () => {
    const builder = makeBuilder({ data: { id: "p1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await updatePelangganInfo("p1", { no_hp: "0812", alamat: "", ekspedisi_biasa: undefined });

    const payload = builder.update.mock.calls[0][0];
    expect(payload.no_hp).toBe("0812");
    expect(payload).not.toHaveProperty("alamat");
    expect(payload).not.toHaveProperty("ekspedisi_biasa");
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal update") }));
    await expect(updatePelangganInfo("p1", { no_hp: "0812" })).rejects.toThrow("gagal update");
  });
});

describe("fetchPelangganPins", () => {
  it("query pelanggan dengan lat & lng not null, select termasuk geocode_source", async () => {
    const builder = makeBuilder({ data: [{ id: "p1", lat: -7.1, lng: 112.7 }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await fetchPelangganPins();

    expect(supabaseMock.from).toHaveBeenCalledWith("pelanggan");
    expect(builder.select).toHaveBeenCalledWith(expect.stringContaining("geocode_source"));
    expect(builder.not).toHaveBeenCalledWith("lat", "is", null);
    expect(builder.not).toHaveBeenCalledWith("lng", "is", null);
    expect(result).toEqual([{ id: "p1", lat: -7.1, lng: 112.7 }]);
  });

  it("pin dgn geocode_source approx-daerah ikut ke-passthrough apa adanya (penandaan APPROKSIMASI)", async () => {
    const builder = makeBuilder({
      data: [{ id: "p2", lat: -7.4, lng: 112.6, geocode_source: "approx-daerah" }],
      error: null,
    });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await fetchPelangganPins();
    expect(result[0].geocode_source).toBe("approx-daerah");
  });

  it("fallback ke [] saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await fetchPelangganPins()).toEqual([]);
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal") }));
    await expect(fetchPelangganPins()).rejects.toThrow("gagal");
  });
});

describe("fetchPelangganNeedingGeocode", () => {
  it("query pelanggan dengan lat null & alamat terisi", async () => {
    const builder = makeBuilder({ data: [{ id: "p1", alamat: "Jl. Mawar" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await fetchPelangganNeedingGeocode();

    expect(supabaseMock.from).toHaveBeenCalledWith("pelanggan");
    expect(builder.is).toHaveBeenCalledWith("lat", null);
    expect(builder.not).toHaveBeenCalledWith("alamat", "is", null);
    expect(builder.neq).toHaveBeenCalledWith("alamat", "");
    expect(result).toEqual([{ id: "p1", alamat: "Jl. Mawar" }]);
  });

  it("fallback ke [] saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await fetchPelangganNeedingGeocode()).toEqual([]);
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal") }));
    await expect(fetchPelangganNeedingGeocode()).rejects.toThrow("gagal");
  });
});

describe("setPelangganLocation", () => {
  it("melempar error saat id kosong", async () => {
    await expect(setPelangganLocation(null, { lat: 1, lng: 2, source: "auto" })).rejects.toThrow(
      "id pelanggan wajib diisi.",
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("update lat/lng/geocode_source/geocoded_at", async () => {
    const builder = makeBuilder({ data: { id: "p1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await setPelangganLocation("p1", { lat: -7.44, lng: 112.71, source: "auto" });

    const payload = builder.update.mock.calls[0][0];
    expect(payload.lat).toBe(-7.44);
    expect(payload.lng).toBe(112.71);
    expect(payload.geocode_source).toBe("auto");
    expect(payload.geocoded_at).toBeDefined();
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("melempar error dari Supabase", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("gagal update") }));
    await expect(setPelangganLocation("p1", { lat: 1, lng: 2, source: "auto" })).rejects.toThrow(
      "gagal update",
    );
  });
});
