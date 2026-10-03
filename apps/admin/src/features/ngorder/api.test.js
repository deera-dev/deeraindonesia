import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const {
  fetchTokoList,
  createToko,
  updateToko,
  deleteToko,
  fetchTokoItems,
  createKiriman,
  updateItemStatus,
  setTokoLocation,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("fetchTokoList", () => {
  it("mengambil semua toko terurut nama", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "t1" }], error: null }));
    const result = await fetchTokoList();
    expect(supabaseMock.from).toHaveBeenCalledWith("toko");
    expect(result).toEqual([{ id: "t1" }]);
  });
});

describe("createToko", () => {
  it("melempar error saat nama kosong", async () => {
    await expect(createToko({ nama: "" })).rejects.toThrow("Nama toko wajib diisi.");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("insert payload ter-trim, field kosong jadi null", async () => {
    const builder = makeBuilder({ data: { id: "t-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    const result = await createToko({ nama: "  UD Baru  ", alamat: "", kontak_nama: undefined, no_hp: "0812" });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "UD Baru", alamat: null, kontak_nama: null, no_hp: "0812" }),
    );
    expect(result).toEqual({ id: "t-new" });
  });

  it("default status_approach 'belum' dan kesan null kalau tidak diisi", async () => {
    const builder = makeBuilder({ data: { id: "t-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await createToko({ nama: "Toko Baru" });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status_approach: "belum", kesan: null }),
    );
  });

  it("kesan diabaikan (dipaksa null) kalau status_approach bukan 'sudah'", async () => {
    const builder = makeBuilder({ data: { id: "t-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await createToko({ nama: "Toko Baru", status_approach: "belum", kesan: "tertarik" });
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ kesan: null }));
  });

  it("menyimpan daerah, media_sosial, status_approach=sudah, dan kesan", async () => {
    const builder = makeBuilder({ data: { id: "t-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await createToko({
      nama: "Toko Baru",
      daerah: "Sidoarjo",
      media_sosial: "@tokobaru",
      status_approach: "sudah",
      kesan: "tertarik",
    });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        daerah: "Sidoarjo",
        media_sosial: "@tokobaru",
        status_approach: "sudah",
        kesan: "tertarik",
      }),
    );
  });
});

describe("updateToko", () => {
  it("melempar error saat id kosong", async () => {
    await expect(updateToko(null, {})).rejects.toThrow("id toko wajib diisi.");
  });

  it("hanya menimpa field yang disebut di patch", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateToko("t1", { no_hp: "0812" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.no_hp).toBe("0812");
    expect(payload).not.toHaveProperty("nama");
  });

  it("set status_approach ke 'sudah' tidak otomatis mengosongkan kesan", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateToko("t1", { status_approach: "sudah" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.status_approach).toBe("sudah");
    expect(payload).not.toHaveProperty("kesan");
  });

  it("balik status_approach ke 'belum' otomatis mengosongkan kesan", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateToko("t1", { status_approach: "belum" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.status_approach).toBe("belum");
    expect(payload.kesan).toBeNull();
  });

  it("update kesan saja (tanpa status_approach) tetap tersimpan", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateToko("t1", { kesan: "belum_tertarik" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.kesan).toBe("belum_tertarik");
  });
});

describe("deleteToko", () => {
  it("melempar error saat id kosong", async () => {
    await expect(deleteToko(null)).rejects.toThrow("id toko wajib diisi.");
  });

  it("delete by id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await deleteToko("t1");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "t1");
  });
});

describe("fetchTokoItems", () => {
  it("query sampel_kiriman_item dgn join tanggal, filter toko_id, order created_at asc", async () => {
    const builder = makeBuilder({ data: [{ id: "i1" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    const result = await fetchTokoItems("t1");
    expect(supabaseMock.from).toHaveBeenCalledWith("sampel_kiriman_item");
    expect(builder.eq).toHaveBeenCalledWith("toko_id", "t1");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual([{ id: "i1" }]);
  });
});

describe("createKiriman", () => {
  it("melempar error saat toko tidak dipilih", async () => {
    await expect(createKiriman({ items: [{ kode: "D-01" }] })).rejects.toThrow("Toko wajib dipilih.");
  });

  it("melempar error saat tidak ada item", async () => {
    await expect(createKiriman({ tokoId: "t1", items: [] })).rejects.toThrow(
      "Pilih minimal satu produk untuk dikirim.",
    );
  });

  it("insert kiriman lalu bulk insert item dgn status pending", async () => {
    const kirimanBuilder = makeBuilder({ data: { id: "k1" }, error: null });
    const itemsBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(kirimanBuilder).mockReturnValueOnce(itemsBuilder);

    await createKiriman({
      tokoId: "t1",
      tanggal: "2026-10-03",
      catatan: "dibawa Budi",
      items: [{ kode: "D-01", nama: "Gamis A" }],
      user: { email: "a@b.com", name: "Admin" },
    });

    expect(kirimanBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ toko_id: "t1", tanggal: "2026-10-03" }),
    );
    expect(itemsBuilder.insert).toHaveBeenCalledWith([
      { kiriman_id: "k1", toko_id: "t1", kode: "D-01", nama: "Gamis A", status: "pending" },
    ]);
  });
});

describe("updateItemStatus", () => {
  it("update status + updated_at", async () => {
    const builder = makeBuilder({ data: { id: "i1", status: "dipilih" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateItemStatus("i1", "dipilih");
    const payload = builder.update.mock.calls[0][0];
    expect(payload.status).toBe("dipilih");
    expect(payload.updated_at).toBeDefined();
    expect(builder.eq).toHaveBeenCalledWith("id", "i1");
  });
});

describe("setTokoLocation", () => {
  it("melempar error saat id kosong", async () => {
    await expect(setTokoLocation(null, { lat: 1, lng: 2, source: "auto" })).rejects.toThrow(
      "id toko wajib diisi.",
    );
  });

  it("update lat/lng/geocode_source/geocoded_at", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await setTokoLocation("t1", { lat: -7.44, lng: 112.71, source: "manual" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.lat).toBe(-7.44);
    expect(payload.lng).toBe(112.71);
    expect(payload.geocode_source).toBe("manual");
    expect(payload.geocoded_at).toBeDefined();
    expect(builder.eq).toHaveBeenCalledWith("id", "t1");
  });
});
