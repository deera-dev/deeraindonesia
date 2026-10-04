import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchTrips, createTrip, updateTrip, deleteTrip } = await import("./api");

beforeEach(() => resetSupabaseMock(supabaseMock));

describe("fetchTrips", () => {
  it("ambil semua dari ngorder_trip", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "1" }], error: null }));
    expect(await fetchTrips()).toEqual([{ id: "1" }]);
    expect(supabaseMock.from).toHaveBeenCalledWith("ngorder_trip");
  });
});

describe("createTrip", () => {
  it("validasi dulu — tidak menyentuh Supabase kalau tidak valid", async () => {
    await expect(createTrip({ nama: "", tanggal_mulai: "2026-10-03", tanggal_selesai: "2026-10-03" })).rejects.toThrow(/Nama/);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("normalisasi: trim, dedupe daerah/peserta, modal bulat >= 0, email pembuat", async () => {
    const builder = makeBuilder({ data: { id: "new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await createTrip({
      nama: "  Jateng ",
      tanggal_mulai: "2026-10-03",
      tanggal_selesai: "2026-10-05",
      daerah: [" Tegal", "Tegal", "", "Brebes"],
      peserta: ["Denny "],
      modal_awal: "1500000.4",
      catatan: "  ",
      user: { email: "a@b.c" },
    });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nama: "Jateng",
        daerah: ["Tegal", "Brebes"],
        peserta: ["Denny"],
        modal_awal: 1500000,
        catatan: null,
        created_by_email: "a@b.c",
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
