import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

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
  fetchRencana,
  fetchKunjunganToko,
  addRencana,
  removeRencana,
  updateKunjungan,
  markTokoVisitedViaTrip,
  markGeocodeFailed,
  subscribeNgorder,
  resolveGoogleMapsLink,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  vi.stubGlobal("fetch", vi.fn());
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
    const result = await createToko({
      nama: "  UD Baru  ",
      alamat: "",
      kontak_nama: undefined,
      no_hp: "0812",
    });
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
    await expect(createKiriman({ items: [{ kode: "D-01" }] })).rejects.toThrow(
      "Toko wajib dipilih.",
    );
  });

  it("melempar error saat tidak ada item", async () => {
    await expect(createKiriman({ tokoId: "t1", items: [] })).rejects.toThrow(
      "Pilih minimal satu produk untuk dikirim.",
    );
  });

  // Insert kiriman + bulk insert item sekarang 1 RPC atomik
  // (create_kiriman), identitas dari auth.uid() — lihat
  // supabase/migrations/20261120_ngorder_crud.sql.
  it("memanggil create_kiriman dengan toko/tanggal/catatan/items", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { id: "k1" }, error: null });

    await createKiriman({
      tokoId: "t1",
      tanggal: "2026-10-03",
      catatan: "dibawa Budi",
      items: [{ kode: "D-01", nama: "Gamis A" }],
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("create_kiriman", {
      p_toko_id: "t1",
      p_tanggal: "2026-10-03",
      p_catatan: "dibawa Budi",
      p_items: [{ kode: "D-01", nama: "Gamis A" }],
    });
  });

  it("throws kalau RPC gagal", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(
      createKiriman({ tokoId: "t1", items: [{ kode: "D-01", nama: "A" }] }),
    ).rejects.toThrow("boom");
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

describe("updateToko kesan + status sekaligus", () => {
  it("status_approach 'sudah' + kesan dalam satu patch → kesan ikut tersimpan", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateToko("t1", { status_approach: "sudah", kesan: "tertarik" });
    expect(builder.update.mock.calls[0][0]).toMatchObject({
      status_approach: "sudah",
      kesan: "tertarik",
    });
  });

  it("status_approach 'belum' tetap mengosongkan kesan walau kesan dikirim", async () => {
    const builder = makeBuilder({ data: { id: "t1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateToko("t1", { status_approach: "belum", kesan: "tertarik" });
    expect(builder.update.mock.calls[0][0].kesan).toBeNull();
  });
});

describe("rencana kunjungan (toko_kunjungan)", () => {
  it("fetchRencana hanya baris aktif", async () => {
    const builder = makeBuilder({ data: [{ id: "k1" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    expect(await fetchRencana()).toEqual([{ id: "k1" }]);
    expect(supabaseMock.from).toHaveBeenCalledWith("toko_kunjungan");
    expect(builder.eq).toHaveBeenCalledWith("aktif", true);
  });

  it("fetchKunjunganToko membuang baris rencana kosong (belum ada catatan)", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({
        data: [
          { id: "k1", status: "rencana" },
          { id: "k2", status: "selesai" },
          { id: "k3", status: "rencana", request: "warna maroon" },
        ],
        error: null,
      }),
    );
    expect((await fetchKunjunganToko("t1")).map((r) => r.id)).toEqual(["k2", "k3"]);
  });

  // Dulu select dedup + loop insert satu-satu — sekarang 1 RPC atomik
  // (add_rencana_kunjungan, bulk insert ON CONFLICT DO NOTHING),
  // identitas dari auth.uid() — lihat
  // supabase/migrations/20261120_ngorder_crud.sql.
  it("memanggil add_rencana_kunjungan dengan toko_id unik", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: [{ id: "k2", toko_id: "t2" }], error: null });
    const res = await addRencana({ tokoIds: ["t1", "t2", "t2"] });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("add_rencana_kunjungan", {
      p_toko_ids: ["t1", "t2"],
    });
    expect(res).toEqual([{ id: "k2", toko_id: "t2" }]);
  });

  it("tokoIds kosong -> tidak memanggil RPC", async () => {
    expect(await addRencana({ tokoIds: [] })).toEqual([]);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  // Dulu 2 operasi terpisah (delete batch + update batch) tanpa
  // transaction bersama — sekarang 1 RPC atomik
  // (remove_rencana_kunjungan).
  it("removeRencana: baris kosong dihapus, baris bercatatan diarsipkan (aktif=false)", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: null });
    await removeRencana([
      { id: "k1", status: "rencana" },
      { id: "k2", status: "selesai", hasil: "ok" },
    ]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("remove_rencana_kunjungan", {
      p_blank_ids: ["k1"],
      p_keep_ids: ["k2"],
    });
  });

  // Dulu update toko_kunjungan lalu (kalau selesai) update toko TANPA
  // try/catch, 2 langkah tanpa transaction — sekarang 1 RPC atomik
  // (update_kunjungan), identitas dari auth.uid().
  it("updateKunjungan 'berlangsung' memanggil RPC dengan patch yang benar", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { id: "k1", toko_id: "t1", status: "berlangsung" },
      error: null,
    });
    await updateKunjungan({
      row: { id: "k1" },
      patch: { status: "berlangsung", hasil: "  ketemu owner " },
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith("update_kunjungan", {
      p_id: "k1",
      p_patch: { status: "berlangsung", hasil: "  ketemu owner " },
    });
  });

  it("updateKunjungan 'selesai' -> fire-and-forget markTokoVisitedInActiveTrips", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { id: "k1", toko_id: "t1", status: "selesai", kesan: "tertarik" },
      error: null,
    });
    await updateKunjungan({ row: { id: "k1" }, patch: { status: "selesai", kesan: "tertarik" } });
    // Best-effort (fire-and-forget): juga coba sinkron checklist trip --
    // lihat mark_toko_visited_in_active_trips.
    expect(supabaseMock.rpc).toHaveBeenCalledWith("mark_toko_visited_in_active_trips", {
      p_toko_id: "t1",
    });
  });

  it("updateKunjungan status bukan selesai -> tidak panggil mark_toko_visited_in_active_trips", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { id: "k1", toko_id: "t1", status: "berlangsung" },
      error: null,
    });
    await updateKunjungan({ row: { id: "k1" }, patch: { status: "berlangsung" } });
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
  });

  it("throws kalau RPC gagal", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(
      updateKunjungan({ row: { id: "k1" }, patch: { status: "selesai" } }),
    ).rejects.toThrow("boom");
  });

  it("markGeocodeFailed menandai geocode_source 'gagal'", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await markGeocodeFailed("t1");
    expect(builder.update.mock.calls[0][0]).toMatchObject({ geocode_source: "gagal" });
  });

  it("subscribeNgorder mendengar toko_kunjungan & toko, unsubscribe melepas channel", () => {
    const unsub = subscribeNgorder(vi.fn());
    const channel = supabaseMock.channel.mock.results[0].value;
    const tables = channel.on.mock.calls.map((c) => c[1].table);
    expect(tables).toEqual(["toko_kunjungan", "toko"]);
    unsub();
    expect(supabaseMock.removeChannel).toHaveBeenCalledWith(channel);
  });
});

describe("markTokoVisitedViaTrip (sinkron dari checklist trip, ngorder-jadwal)", () => {
  it("tanpa tokoId: tidak menyentuh Supabase, return null", async () => {
    expect(await markTokoVisitedViaTrip(null)).toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  // Jalur insert-baru dulu insert toko_kunjungan lalu update toko
  // terpisah tanpa transaction — sekarang 1 RPC atomik
  // (create_kunjungan_selesai) — lihat
  // supabase/migrations/20261120_ngorder_crud.sql.
  it("belum ada kunjungan aktif -> panggil create_kunjungan_selesai", async () => {
    const selectBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(selectBuilder);
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { id: "k2", toko_id: "t1", status: "selesai" },
      error: null,
    });

    const result = await markTokoVisitedViaTrip("t1");

    expect(selectBuilder.eq).toHaveBeenCalledWith("aktif", true);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("create_kunjungan_selesai", {
      p_toko_id: "t1",
    });
    expect(result).toEqual({ id: "k2", toko_id: "t1", status: "selesai" });
  });

  it("ada kunjungan aktif status rencana -> ditandai selesai lewat update_kunjungan (bukan insert baru)", async () => {
    const existing = { id: "k1", toko_id: "t1", status: "rencana", mulai_at: null };
    const selectBuilder = makeBuilder({ data: existing, error: null });
    supabaseMock.from.mockReturnValueOnce(selectBuilder);
    supabaseMock.rpc.mockResolvedValueOnce({
      data: { id: "k1", toko_id: "t1", status: "selesai", kesan: null },
      error: null,
    });

    const result = await markTokoVisitedViaTrip("t1");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("update_kunjungan", {
      p_id: "k1",
      p_patch: { status: "selesai" },
    });
    expect(result.status).toBe("selesai");
  });

  it("kunjungan aktif sudah selesai -> gak ngapa-ngapain lagi", async () => {
    const existing = { id: "k1", toko_id: "t1", status: "selesai" };
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: existing, error: null }));

    const result = await markTokoVisitedViaTrip("t1");

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(result).toEqual(existing);
  });
});

describe("resolveGoogleMapsLink", () => {
  it("POST ke /api/resolve-maps-link dan mengembalikan hasil parse", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        nama: "Husna Boutique",
        lat: -6.9,
        lng: 106.9,
        mapsUrl: "https://www.google.com/maps/place/Husna+Boutique/@-6.9,106.9,17z",
      }),
    });
    const result = await resolveGoogleMapsLink("https://share.google/Sf1aAl24CjQurS8Qd");
    expect(fetch).toHaveBeenCalledWith(
      "/api/resolve-maps-link",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://share.google/Sf1aAl24CjQurS8Qd" }),
      }),
    );
    expect(result).toEqual({
      nama: "Husna Boutique",
      lat: -6.9,
      lng: 106.9,
      mapsUrl: "https://www.google.com/maps/place/Husna+Boutique/@-6.9,106.9,17z",
    });
  });

  it("melempar pesan error dari server kalau gagal", async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Bukan link Google Maps yang valid." }),
    });
    await expect(resolveGoogleMapsLink("https://bukan-maps.com")).rejects.toThrow(
      "Bukan link Google Maps yang valid.",
    );
  });
});
