import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchPengiriman, createPengiriman, updatePengiriman, deletePengiriman } = await import(
  "./api"
);

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
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

// create_pengiriman/update_pengiriman: dulu resolvePelangganLink (insert/
// update pelanggan) + insert/update pengiriman adalah 2 network call
// terpisah non-atomik, dan created_by/created_by_name dikirim dari client
// (useAuth()) -> spoofable. Sekarang 1 RPC atomik per aksi, identitas dari
// auth.uid() -> profiles di DB -- lihat supabase/migrations/20261120_history_pengiriman_crud.sql.
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

  it("memanggil RPC create_pengiriman dengan parameter yang benar", async () => {
    const inserted = { id: "pg1", pengiriman_no: "KRM-20260824-123" };
    supabaseMock.rpc.mockResolvedValueOnce({ data: inserted, error: null });

    const result = await createPengiriman(validPayload);

    expect(result).toEqual(inserted);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("create_pengiriman", {
      p_tanggal: "2026-08-24",
      p_nama_penerima: "Budi",
      p_no_telp_penerima: "08123456789",
      p_alamat: null,
      p_pelanggan_id: null,
      p_jumlah_karung: 5,
      p_isi_karung: "Gamis dan mukena campur",
      p_nama_ekspedisi: "JNE",
      p_nama_pengirim: "Siti",
    });
  });

  it("pelangganId & alamat ikut diteruskan ke RPC", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { id: "pg2" }, error: null });

    await createPengiriman({ ...validPayload, pelangganId: "p-existing", alamat: "Jl. A" });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "create_pengiriman",
      expect.objectContaining({ p_pelanggan_id: "p-existing", p_alamat: "Jl. A" }),
    );
  });

  it("melempar error kalau RPC gagal (termasuk validasi server-side)", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Tanggal wajib diisi." },
    });
    await expect(createPengiriman({ ...validPayload, tanggal: "" })).rejects.toThrow(
      "Tanggal wajib diisi.",
    );
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

  it("memanggil RPC update_pengiriman dengan id + payload", async () => {
    const updated = { id: "pg4", nama_penerima: "Budi" };
    supabaseMock.rpc.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updatePengiriman(target, validPayload);

    expect(result).toEqual(updated);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("update_pengiriman", {
      p_id: "pg4",
      p_tanggal: "2026-08-24",
      p_nama_penerima: "Budi",
      p_no_telp_penerima: null,
      p_alamat: null,
      p_pelanggan_id: null,
      p_jumlah_karung: 3,
      p_isi_karung: null,
      p_nama_ekspedisi: "J&T",
      p_nama_pengirim: "Siti",
    });
  });

  it("alamat & pelanggan_id ikut dikirim ke RPC", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { id: "pg4" }, error: null });

    await updatePengiriman(target, {
      ...validPayload,
      alamat: "Jl. Baru No. 2",
      pelangganId: "p-existing",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "update_pengiriman",
      expect.objectContaining({ p_alamat: "Jl. Baru No. 2", p_pelanggan_id: "p-existing" }),
    );
  });

  it("melempar error kalau RPC gagal", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Pengiriman tidak ditemukan." },
    });
    await expect(updatePengiriman(target, validPayload)).rejects.toThrow(
      "Pengiriman tidak ditemukan.",
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
