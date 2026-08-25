import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

// Daftar penerima (permintaan Denny 2026-08) reuse `../pelanggan/api` —
// di-mock LANGSUNG di sini (bukan lewat supabaseMock) supaya panggilan
// resolve-pelanggan tidak "mencuri" antrean `mockReturnValueOnce` yang
// disiapkan test untuk operasi tabel `pengiriman` sendiri.
vi.mock("../pelanggan/api", () => ({
  createPelanggan: vi.fn(),
  findPelangganByNama: vi.fn(),
  updatePelangganInfo: vi.fn(),
}));

const {
  generatePengirimanNo,
  fetchPengiriman,
  createPengiriman,
  updatePengiriman,
  deletePengiriman,
} = await import("./api");
const { createPelanggan, findPelangganByNama, updatePelangganInfo } = await import("../pelanggan/api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  createPelanggan.mockReset().mockResolvedValue({ id: "p-auto-created" });
  findPelangganByNama.mockReset().mockResolvedValue(null);
  updatePelangganInfo.mockReset().mockResolvedValue({ id: "p-updated" });
});

describe("generatePengirimanNo", () => {
  it("menghasilkan format KRM-YYYYMMDD-xxx", () => {
    const no = generatePengirimanNo();
    expect(no).toMatch(/^KRM-\d{8}-\d{3}$/);
  });
});

describe("fetchPengiriman", () => {
  it("tanpa filter tanggal -> gte/lte tidak dipanggil", async () => {
    const builder = makeBuilder({ data: [{ id: "p1" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await fetchPengiriman();

    expect(builder.gte).not.toHaveBeenCalled();
    expect(builder.lte).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: "p1" }]);
  });

  it("dateFrom diberikan -> memanggil gte('tanggal', ...)", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchPengiriman("2026-08-01");

    expect(builder.gte).toHaveBeenCalledWith("tanggal", "2026-08-01");
  });

  it("dateTo diberikan -> memanggil lte('tanggal', ...)", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchPengiriman(null, "2026-08-31");

    expect(builder.lte).toHaveBeenCalledWith("tanggal", "2026-08-31");
  });

  it("melempar error saat query gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: new Error("fetch gagal") }),
    );
    await expect(fetchPengiriman()).rejects.toThrow("fetch gagal");
  });

  it("fallback ke array kosong saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    await expect(fetchPengiriman()).resolves.toEqual([]);
  });
});

describe("createPengiriman", () => {
  const validPayload = {
    tanggal: "2026-08-24",
    namaPenerima: "Budi",
    noTelpPenerima: "08123456789",
    jumlahKarung: 5,
    isiKarung: "Gamis dan mukena campur",
    namaEkspedisi: "JNE",
    namaPengirim: "Siti",
  };

  it("melempar error jika tanggal kosong", async () => {
    await expect(createPengiriman({ ...validPayload, tanggal: "" })).rejects.toThrow(
      "Tanggal wajib diisi.",
    );
  });

  it("melempar error jika nama penerima kosong", async () => {
    await expect(createPengiriman({ ...validPayload, namaPenerima: "  " })).rejects.toThrow(
      "Nama penerima wajib diisi.",
    );
  });

  it("melempar error jika jumlah karung <= 0", async () => {
    await expect(createPengiriman({ ...validPayload, jumlahKarung: 0 })).rejects.toThrow(
      "Jumlah karung harus lebih dari 0.",
    );
  });

  it("melempar error jika nama ekspedisi kosong", async () => {
    await expect(createPengiriman({ ...validPayload, namaEkspedisi: "" })).rejects.toThrow(
      "Nama ekspedisi wajib diisi.",
    );
  });

  it("melempar error jika nama pengirim kosong", async () => {
    await expect(createPengiriman({ ...validPayload, namaPengirim: "" })).rejects.toThrow(
      "Nama pengirim wajib diisi.",
    );
  });

  it("melempar error saat insert gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: new Error("insert gagal") }),
    );
    await expect(createPengiriman(validPayload)).rejects.toThrow("insert gagal");
  });

  it("sukses membuat pengiriman dgn payload lengkap + user", async () => {
    const inserted = { id: "pg1", pengiriman_no: "KRM-20260824-123" };
    const insertBuilder = makeBuilder({ data: inserted, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);

    const result = await createPengiriman({
      ...validPayload,
      user: { email: "admin@deera.id", user_metadata: { full_name: "Admin Satu" } },
    });

    expect(result).toEqual(inserted);
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tanggal: "2026-08-24",
        nama_penerima: "Budi",
        no_telp_penerima: "08123456789",
        jumlah_karung: 5,
        isi_karung: "Gamis dan mukena campur",
        nama_ekspedisi: "JNE",
        nama_pengirim: "Siti",
        created_by: "admin@deera.id",
        created_by_name: "ADMIN SATU",
      }),
    );
  });

  it("noTelpPenerima & isiKarung kosong -> disimpan null, user undefined -> created_by null & nama '-'", async () => {
    const insertBuilder = makeBuilder({ data: { id: "pg2" }, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);

    await createPengiriman({ ...validPayload, noTelpPenerima: "", isiKarung: "" });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        no_telp_penerima: null,
        isi_karung: null,
        created_by: null,
        created_by_name: "-",
      }),
    );
  });

  it("generatePengirimanNo dipakai sbg pengiriman_no", async () => {
    const insertBuilder = makeBuilder({ data: { id: "pg3" }, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);

    await createPengiriman(validPayload);

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ pengiriman_no: expect.stringMatching(/^KRM-\d{8}-\d{3}$/) }),
    );
  });

  it("alamat disimpan trim, atau null kalau kosong/tidak diisi", async () => {
    const insertBuilder = makeBuilder({ data: { id: "pg-a" }, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);
    await createPengiriman({ ...validPayload, alamat: "  Jl. Mawar No. 1  " });
    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ alamat: "Jl. Mawar No. 1" }));

    const insertBuilder2 = makeBuilder({ data: { id: "pg-b" }, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder2);
    await createPengiriman(validPayload);
    expect(insertBuilder2.insert).toHaveBeenCalledWith(expect.objectContaining({ alamat: null }));
  });

  describe("resolusi pelanggan_id (daftar penerima, permintaan Denny 2026-08)", () => {
    it("pelangganId dipilih dari autocomplete → updatePelangganInfo dipanggil, pelanggan_id ikut id itu", async () => {
      const insertBuilder = makeBuilder({ data: { id: "pg-x" }, error: null });
      supabaseMock.from.mockReturnValueOnce(insertBuilder);

      await createPengiriman({ ...validPayload, pelangganId: "p-existing", alamat: "Jl. A" });

      expect(findPelangganByNama).not.toHaveBeenCalled();
      expect(createPelanggan).not.toHaveBeenCalled();
      expect(updatePelangganInfo).toHaveBeenCalledWith(
        "p-existing",
        expect.objectContaining({ no_hp: "08123456789", alamat: "Jl. A", ekspedisi_biasa: "JNE" }),
      );
      expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ pelanggan_id: "p-existing" }));
    });

    it("tanpa pelangganId, nama cocok persis dgn pelanggan lama → link ke situ & update datanya", async () => {
      findPelangganByNama.mockResolvedValue({ id: "p-lama", nama: "Budi" });
      const insertBuilder = makeBuilder({ data: { id: "pg-y" }, error: null });
      supabaseMock.from.mockReturnValueOnce(insertBuilder);

      await createPengiriman(validPayload);

      expect(findPelangganByNama).toHaveBeenCalledWith("Budi");
      expect(updatePelangganInfo).toHaveBeenCalledWith("p-lama", expect.anything());
      expect(createPelanggan).not.toHaveBeenCalled();
      expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ pelanggan_id: "p-lama" }));
    });

    it("tanpa pelangganId & tidak ada nama cocok → auto-create pelanggan baru", async () => {
      const insertBuilder = makeBuilder({ data: { id: "pg-z" }, error: null });
      supabaseMock.from.mockReturnValueOnce(insertBuilder);

      await createPengiriman(validPayload);

      expect(createPelanggan).toHaveBeenCalledWith(
        expect.objectContaining({ nama: "Budi", no_hp: "08123456789", ekspedisi_biasa: "JNE" }),
      );
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ pelanggan_id: "p-auto-created" }),
      );
    });

    it("resolve pelanggan gagal total (tanpa pelangganId) → pengiriman TETAP dibuat, pelanggan_id null", async () => {
      findPelangganByNama.mockRejectedValue(new Error("network error"));
      const insertBuilder = makeBuilder({ data: { id: "pg-fail" }, error: null });
      supabaseMock.from.mockReturnValueOnce(insertBuilder);

      const result = await createPengiriman(validPayload);

      expect(result).toEqual({ id: "pg-fail" });
      expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ pelanggan_id: null }));
    });

    it("resolve pelanggan gagal (pelangganId ada tapi update gagal) → pengiriman TETAP link ke pelangganId semula", async () => {
      updatePelangganInfo.mockRejectedValue(new Error("update gagal"));
      const insertBuilder = makeBuilder({ data: { id: "pg-fail2" }, error: null });
      supabaseMock.from.mockReturnValueOnce(insertBuilder);

      await createPengiriman({ ...validPayload, pelangganId: "p-existing" });

      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ pelanggan_id: "p-existing" }),
      );
    });
  });
});

describe("updatePengiriman", () => {
  const target = { id: "pg4" };
  const validPayload = {
    tanggal: "2026-08-24",
    namaPenerima: "Budi",
    jumlahKarung: 3,
    namaEkspedisi: "J&T",
    namaPengirim: "Siti",
  };

  it("melempar error jika tanggal kosong", async () => {
    await expect(updatePengiriman(target, { ...validPayload, tanggal: "" })).rejects.toThrow(
      "Tanggal wajib diisi.",
    );
  });

  it("melempar error jika nama penerima kosong", async () => {
    await expect(
      updatePengiriman(target, { ...validPayload, namaPenerima: "" }),
    ).rejects.toThrow("Nama penerima wajib diisi.");
  });

  it("melempar error jika jumlah karung <= 0", async () => {
    await expect(
      updatePengiriman(target, { ...validPayload, jumlahKarung: 0 }),
    ).rejects.toThrow("Jumlah karung harus lebih dari 0.");
  });

  it("melempar error jika nama ekspedisi kosong", async () => {
    await expect(
      updatePengiriman(target, { ...validPayload, namaEkspedisi: "" }),
    ).rejects.toThrow("Nama ekspedisi wajib diisi.");
  });

  it("melempar error jika nama pengirim kosong", async () => {
    await expect(
      updatePengiriman(target, { ...validPayload, namaPengirim: "" }),
    ).rejects.toThrow("Nama pengirim wajib diisi.");
  });

  it("sukses mengupdate pengiriman", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await updatePengiriman(target, validPayload);

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tanggal: "2026-08-24",
        nama_penerima: "Budi",
        jumlah_karung: 3,
        nama_ekspedisi: "J&T",
        nama_pengirim: "Siti",
      }),
    );
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "pg4");
  });

  it("melempar error saat update gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ error: new Error("update gagal") }));
    await expect(updatePengiriman(target, validPayload)).rejects.toThrow("update gagal");
  });

  it("alamat & pelanggan_id ikut dikirim ke update", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await updatePengiriman(target, { ...validPayload, alamat: "Jl. Baru No. 2", pelangganId: "p-existing" });

    expect(updatePelangganInfo).toHaveBeenCalledWith(
      "p-existing",
      expect.objectContaining({ alamat: "Jl. Baru No. 2" }),
    );
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ alamat: "Jl. Baru No. 2", pelanggan_id: "p-existing" }),
    );
  });

  it("tanpa pelangganId & tidak ada nama cocok → auto-create pelanggan baru saat edit juga", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await updatePengiriman(target, validPayload);

    expect(createPelanggan).toHaveBeenCalledWith(expect.objectContaining({ nama: "Budi" }));
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ pelanggan_id: "p-auto-created" }),
    );
  });
});

describe("deletePengiriman", () => {
  it("sukses menghapus pengiriman berdasar id", async () => {
    const builder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await deletePengiriman({ id: "pg5" });

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "pg5");
  });

  it("melempar error saat delete gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ error: new Error("delete gagal") }));
    await expect(deletePengiriman({ id: "pg5" })).rejects.toThrow("delete gagal");
  });
});
