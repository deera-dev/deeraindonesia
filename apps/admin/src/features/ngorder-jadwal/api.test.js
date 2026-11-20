import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const markTokoVisitedViaTrip = vi.fn().mockResolvedValue({ id: "k1" });
vi.mock("../ngorder/api", () => ({
  markTokoVisitedViaTrip: (...args) => markTokoVisitedViaTrip(...args),
}));

const {
  fetchTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  fetchTripOpens,
  markTokoVisitedInActiveTrips,
  toggleTripTokoVisited,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  markTokoVisitedViaTrip.mockClear();
});

describe("fetchTrips", () => {
  it("ambil semua dari ngorder_trip", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "1" }], error: null }));
    expect(await fetchTrips()).toEqual([{ id: "1" }]);
    expect(supabaseMock.from).toHaveBeenCalledWith("ngorder_trip");
  });
});

describe("createTrip", () => {
  it("validasi dulu — tidak menyentuh Supabase kalau tidak valid", async () => {
    await expect(
      createTrip({ nama: "", tanggal_mulai: "2026-10-03", tanggal_selesai: "2026-10-03" }),
    ).rejects.toThrow(/Nama/);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  // Insert tunggal, sudah atomik dari sananya — sekarang 1 RPC
  // (create_ngorder_trip), identitas dari auth.uid() bukan objek `user`
  // client — lihat supabase/migrations/20261120_ngorder_crud.sql.
  it("normalisasi: trim, dedupe daerah/peserta, modal bulat >= 0, lalu panggil RPC", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { id: "new" }, error: null });
    await createTrip({
      nama: "  Jateng ",
      tanggal_mulai: "2026-10-03",
      tanggal_selesai: "2026-10-05",
      daerah: [" Tegal", "Tegal", "", "Brebes"],
      peserta: ["Denny "],
      modal_awal: "1500000.4",
      catatan: "  ",
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "create_ngorder_trip",
      expect.objectContaining({
        p_nama: "Jateng",
        p_daerah: ["Tegal", "Brebes"],
        p_peserta: ["Denny"],
        p_modal_awal: 1500000,
        p_catatan: null,
      }),
    );
  });
});

describe("updateTrip", () => {
  it("hanya field yang ada di patch + updated_at", async () => {
    const builder = makeBuilder({ data: { id: "1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateTrip("1", { biaya: [{ id: "x", jumlah: 5 }], modal_awal: -50 });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.biaya).toEqual([{ id: "x", jumlah: 5 }]);
    expect(payload.modal_awal).toBe(0);
    expect("nama" in payload).toBe(false);
    expect(payload.updated_at).toBeTruthy();
  });
  it("tolak id kosong & nama kosong", async () => {
    await expect(updateTrip("", {})).rejects.toThrow(/id/);
    await expect(updateTrip("1", { nama: " " })).rejects.toThrow(/Nama/);
  });
});

describe("deleteTrip", () => {
  it("hapus by id; error dilempar", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await deleteTrip("1");
    expect(builder.delete).toHaveBeenCalled();
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("x") }));
    await expect(deleteTrip("2")).rejects.toThrow("x");
  });
});

describe("fetchTripOpens", () => {
  it("tanpa tripId: tidak memanggil Supabase, hasil kosong", async () => {
    expect(await fetchTripOpens(null)).toEqual([]);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
  it("memanggil RPC get_ngorder_trip_opens dengan p_trip_id", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ toko_id: "a", opens: 1, produk: ["D-1"] }],
      error: null,
    });
    expect(await fetchTripOpens("trip1")).toEqual([{ toko_id: "a", opens: 1, produk: ["D-1"] }]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_ngorder_trip_opens", { p_trip_id: "trip1" });
  });
  it("melempar error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error("x") });
    await expect(fetchTripOpens("trip1")).rejects.toThrow("x");
  });
});

describe("markTokoVisitedInActiveTrips (sinkron dari toko_kunjungan 'selesai')", () => {
  // Dulu loop update per trip tanpa transaction — sekarang 1 RPC atomik
  // (mark_toko_visited_in_active_trips, 1 UPDATE statement, bukan loop
  // sama sekali) — lihat supabase/migrations/20261120_ngorder_crud.sql.
  it("tanpa tokoId: tidak memanggil RPC", async () => {
    await markTokoVisitedInActiveTrips(null);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("memanggil mark_toko_visited_in_active_trips dengan tokoId", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: null });
    await markTokoVisitedInActiveTrips("t1");
    expect(supabaseMock.rpc).toHaveBeenCalledWith("mark_toko_visited_in_active_trips", {
      p_toko_id: "t1",
    });
  });

  it("throws kalau RPC gagal", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(markTokoVisitedInActiveTrips("t1")).rejects.toThrow("boom");
  });
});

describe("toggleTripTokoVisited (checklist trip)", () => {
  const toko = [
    { toko_id: "t1", dikunjungi: false },
    { toko_id: "t2", dikunjungi: true },
  ];

  it("centang jadi true -> ikut panggil markTokoVisitedViaTrip", async () => {
    const updateBuilder = makeBuilder({ data: { id: "trip1", toko: [] }, error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await toggleTripTokoVisited("trip1", toko, "t1");

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        toko: [
          { toko_id: "t1", dikunjungi: true },
          { toko_id: "t2", dikunjungi: true },
        ],
      }),
    );
    expect(markTokoVisitedViaTrip).toHaveBeenCalledWith("t1");
  });

  it("uncheck (jadi false) -> TIDAK panggil markTokoVisitedViaTrip", async () => {
    const updateBuilder = makeBuilder({ data: { id: "trip1", toko: [] }, error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await toggleTripTokoVisited("trip1", toko, "t2");

    expect(markTokoVisitedViaTrip).not.toHaveBeenCalled();
  });
});
