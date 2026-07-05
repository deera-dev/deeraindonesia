import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

const getCurrentUser = vi.fn();
vi.mock("../auth/api", async () => {
  const actual = await vi.importActual("../auth/api");
  return { ...actual, getCurrentUser };
});

const {
  generateTransferNo,
  fetchPendingTransferCount,
  fetchTransfers,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  deleteTransfer,
  updateTransfer,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  getCurrentUser.mockReset();
  getCurrentUser.mockResolvedValue({
    email: "admin@deera.id",
    user_metadata: { full_name: "Admin Satu" },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateTransferNo", () => {
  it("menghasilkan format SJ-YYYYMMDD-xxx", () => {
    const no = generateTransferNo();
    expect(no).toMatch(/^SJ-\d{8}-\d{3}$/);
  });
});

describe("fetchPendingTransferCount", () => {
  it("mengembalikan count saat sukses", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ count: 7, error: null }));
    await expect(fetchPendingTransferCount()).resolves.toBe(7);
  });

  it("fallback ke 0 saat count null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ count: null, error: null }));
    await expect(fetchPendingTransferCount()).resolves.toBe(0);
  });

  it("melempar error saat query gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ count: null, error: new Error("count gagal") }),
    );
    await expect(fetchPendingTransferCount()).rejects.toThrow("count gagal");
  });
});

describe("fetchTransfers", () => {
  it("default statusFilter 'pending' memanggil eq('status','pending')", async () => {
    const builder = makeBuilder({ data: [{ id: "t1" }], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    const result = await fetchTransfers();

    expect(builder.eq).toHaveBeenCalledWith("status", "pending");
    expect(result).toEqual([{ id: "t1" }]);
  });

  it("statusFilter 'all' tidak memanggil eq('status', ...)", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchTransfers("all");

    expect(builder.eq).not.toHaveBeenCalled();
  });

  it("statusFilter falsy tidak memanggil eq('status', ...)", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchTransfers(null);

    expect(builder.eq).not.toHaveBeenCalled();
  });

  it("dateFrom diberikan -> memanggil gte", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchTransfers("all", "2026-06-01");

    expect(builder.gte).toHaveBeenCalledWith("created_at", "2026-06-01T00:00:00");
  });

  it("dateFrom tidak diberikan -> gte tidak dipanggil", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchTransfers("all", null);

    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("dateTo diberikan -> memanggil lte", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchTransfers("all", null, "2026-06-30");

    expect(builder.lte).toHaveBeenCalledWith("created_at", "2026-06-30T23:59:59");
  });

  it("dateTo tidak diberikan -> lte tidak dipanggil", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await fetchTransfers("all", null, null);

    expect(builder.lte).not.toHaveBeenCalled();
  });

  it("melempar error saat query gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: new Error("fetch gagal") }),
    );
    await expect(fetchTransfers()).rejects.toThrow("fetch gagal");
  });

  it("fallback ke array kosong saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    await expect(fetchTransfers()).resolves.toEqual([]);
  });
});

describe("createTransfer", () => {
  const baseItems = [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 2 }];

  it("melempar error jika fromLocation kosong", async () => {
    await expect(
      createTransfer({ fromLocation: "", toLocation: "cideng", items: baseItems }),
    ).rejects.toThrow("Lengkapi data transfer terlebih dahulu.");
  });

  it("melempar error jika toLocation kosong", async () => {
    await expect(
      createTransfer({ fromLocation: "gudang", toLocation: "", items: baseItems }),
    ).rejects.toThrow("Lengkapi data transfer terlebih dahulu.");
  });

  it("melempar error jika items kosong", async () => {
    await expect(
      createTransfer({ fromLocation: "gudang", toLocation: "cideng", items: [] }),
    ).rejects.toThrow("Lengkapi data transfer terlebih dahulu.");
  });

  it("melempar error jika fromLocation === toLocation", async () => {
    await expect(
      createTransfer({ fromLocation: "gudang", toLocation: "gudang", items: baseItems }),
    ).rejects.toThrow("Dari dan tujuan tidak boleh sama.");
  });

  it("melempar error saat insert gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ data: null, error: new Error("insert gagal") }),
    );
    await expect(
      createTransfer({ fromLocation: "gudang", toLocation: "cideng", items: baseItems }),
    ).rejects.toThrow("insert gagal");
  });

  it("sukses membuat transfer dengan notes & user lengkap", async () => {
    const inserted = {
      id: "t1",
      transfer_no: "SJ-20260630-123",
      from_location: "gudang",
      to_location: "cideng",
      items: baseItems,
      notes: "Catatan",
      status: "pending",
      created_by: "kasir@deera.id",
      created_by_name: "KASIR",
    };
    const insertBuilder = makeBuilder({ data: inserted, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);

    const result = await createTransfer({
      fromLocation: "gudang",
      toLocation: "cideng",
      items: baseItems,
      notes: "Catatan",
      user: { email: "kasir@deera.id", user_metadata: { full_name: "Kasir" } },
    });

    expect(result).toEqual(inserted);
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        from_location: "gudang",
        to_location: "cideng",
        items: baseItems,
        notes: "Catatan",
        status: "pending",
        created_by: "kasir@deera.id",
        created_by_name: "KASIR",
      }),
    );
  });

  it("notes kosong -> disimpan sebagai null, user undefined -> created_by null & nama '-'", async () => {
    const insertBuilder = makeBuilder({ data: { id: "t2" }, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);

    await createTransfer({
      fromLocation: "gudang",
      toLocation: "cideng",
      items: baseItems,
      notes: "",
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null, created_by: null, created_by_name: "-" }),
    );
  });

  it("best-effort logTransfer & notify-transfer tetap dieksekusi sampai tuntas walau gagal total (cover .catch silent)", async () => {
    const insertBuilder = makeBuilder({ data: { id: "t3", items: baseItems }, error: null });
    supabaseMock.from.mockReturnValueOnce(insertBuilder);

    getCurrentUser.mockRejectedValueOnce(new Error("auth down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      throw new Error("warn gagal");
    });

    supabaseMock.functions.invoke.mockReturnValueOnce(Promise.reject(new Error("network fail")));

    const result = await createTransfer({
      fromLocation: "gudang",
      toLocation: "cideng",
      items: baseItems,
      user: { email: "kasir@deera.id" },
    });

    expect(result.id).toBe("t3");

    await new Promise((resolve) => setTimeout(resolve, 0));

    warnSpy.mockRestore();
  });

  it("logTransfer: getCurrentUser resolve tanpa email -> user_email fallback null (cover ?? )", async () => {
    const inserted = { id: "t-cover", items: baseItems };
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: inserted, error: null }));
    getCurrentUser.mockResolvedValueOnce({});

    await createTransfer({
      fromLocation: "gudang",
      toLocation: "cideng",
      items: baseItems,
      user: { email: "kasir@deera.id" },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe("approveTransfer", () => {
  const baseTransfer = {
    id: "tr1",
    status: "pending",
    from_location: "gudang",
    to_location: "cideng",
    created_by: "pembuat@deera.id",
    items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 5 }],
  };

  it("melempar error jika status bukan pending", async () => {
    await expect(
      approveTransfer({ ...baseTransfer, status: "approved" }, { email: "lain@deera.id" }),
    ).rejects.toThrow("Transfer sudah tidak bisa di-approve.");
  });

  it("melempar error jika user mencoba approve transfer buatannya sendiri", async () => {
    await expect(
      approveTransfer(baseTransfer, { email: "pembuat@deera.id" }),
    ).rejects.toThrow(/Tidak bisa menyetujui transfer/);
  });

  it("melempar error jika update status transfer gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({ error: new Error("update status gagal") }),
    );
    await expect(
      approveTransfer(baseTransfer, { email: "lain@deera.id" }),
    ).rejects.toThrow("update status gagal");
  });

  it("item dengan qty <= 0 dilewati tanpa fetch stok_warna", async () => {
    const statusBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(statusBuilder);

    await approveTransfer(
      { ...baseTransfer, items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 0 }] },
      { email: "lain@deera.id" },
    );

    expect(supabaseMock.from).not.toHaveBeenCalledWith("stok_warna");
  });

  it("baris stok_warna tidak ditemukan -> warn dan lanjut tanpa update", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValueOnce(statusBuilder).mockReturnValueOnce(selectBuilder);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await approveTransfer(baseTransfer, { email: "lain@deera.id" });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Stok tidak ditemukan"));
  });

  it("melempar error saat fetch baris stok_warna gagal", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({ data: null, error: new Error("fetch stok gagal") });
    supabaseMock.from.mockReturnValueOnce(statusBuilder).mockReturnValueOnce(selectBuilder);

    await expect(approveTransfer(baseTransfer, { email: "lain@deera.id" })).rejects.toThrow(
      "fetch stok gagal",
    );
  });

  it("baris ditemukan dengan warna spesifik -> filter eq('warna', ...) & update patch from+to", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({
      data: [{ id: "row1", gudang: 10, cideng: 2, tegalgubug: 0 }],
      error: null,
    });
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    await approveTransfer(baseTransfer, { email: "lain@deera.id" });

    expect(selectBuilder.eq).toHaveBeenCalledWith("warna", "HITAM");
    expect(updateBuilder.update).toHaveBeenCalledWith({ gudang: 5, cideng: 7 });
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "row1");
  });

  it("item tanpa warna -> filter is('warna', null)", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({
      data: [{ id: "row2", gudang: 10, cideng: 0, tegalgubug: 0 }],
      error: null,
    });
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    await approveTransfer(
      {
        ...baseTransfer,
        items: [{ kode: "D-02-OSK", size: "Midi", warna: null, qty: 3 }],
      },
      { email: "lain@deera.id" },
    );

    expect(selectBuilder.is).toHaveBeenCalledWith("warna", null);
  });

  it("patch from tidak negatif (Math.max 0) saat qty lebih besar dari stok", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({
      data: [{ id: "row3", gudang: 2, cideng: 0, tegalgubug: 0 }],
      error: null,
    });
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    await approveTransfer(baseTransfer, { email: "lain@deera.id" });

    expect(updateBuilder.update).toHaveBeenCalledWith({ gudang: 0, cideng: 5 });
  });

  it("to_location custom (tidak dikenal) -> hanya kurangi from, tidak menambah to", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({
      data: [{ id: "row4", gudang: 10, cideng: 0, tegalgubug: 0 }],
      error: null,
    });
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    await approveTransfer(
      { ...baseTransfer, to_location: "reseller-budi" },
      { email: "lain@deera.id" },
    );

    expect(updateBuilder.update).toHaveBeenCalledWith({ gudang: 5 });
  });

  it("melempar error saat update stok_warna gagal", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({
      data: [{ id: "row5", gudang: 10, cideng: 0, tegalgubug: 0 }],
      error: null,
    });
    const updateBuilder = makeBuilder({ error: new Error("update stok gagal") });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    await expect(approveTransfer(baseTransfer, { email: "lain@deera.id" })).rejects.toThrow(
      "update stok gagal",
    );
  });

  it("item dengan qty undefined difallback ke 0 lalu di-skip (cover ?? pada qty)", async () => {
    const statusBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(statusBuilder);

    await approveTransfer(
      {
        ...baseTransfer,
        items: [{ kode: "D-09-OSK", size: "Midi", warna: "HITAM", qty: undefined }],
      },
      { email: "lain@deera.id" },
    );

    expect(supabaseMock.from).not.toHaveBeenCalledWith("stok_warna");

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("tanpa user & row stok_warna tanpa field lokasi sama sekali (cover fallback ?? 0 pada patch)", async () => {
    const transfer = {
      id: "tr9",
      status: "pending",
      from_location: "gudang",
      to_location: "cideng",
      created_by: "pembuat@deera.id",
      items: [{ kode: "D-10-OSK", size: "Midi", warna: "HITAM", qty: 4 }],
    };
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({ data: [{ id: "row9" }], error: null });
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    await approveTransfer(transfer, undefined);

    expect(statusBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ approved_by: null }),
    );
    expect(updateBuilder.update).toHaveBeenCalledWith({ gudang: 0, cideng: 4 });
  });

  it("logTransfer gagal total (forced) -> .catch(() => {}) tetap dieksekusi", async () => {
    const statusBuilder = makeBuilder({ error: null });
    const selectBuilder = makeBuilder({
      data: [{ id: "row10", gudang: 10, cideng: 0, tegalgubug: 0 }],
      error: null,
    });
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(statusBuilder)
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(updateBuilder);

    getCurrentUser.mockRejectedValueOnce(new Error("auth down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      throw new Error("warn gagal");
    });

    await approveTransfer(baseTransfer, { email: "lain@deera.id" });

    await new Promise((resolve) => setTimeout(resolve, 0));
    warnSpy.mockRestore();
  });
});

describe("rejectTransfer", () => {
  const baseTransfer = {
    id: "tr2",
    status: "pending",
    notes: "Notes lama",
    created_by: "pembuat@deera.id",
  };

  it("melempar error jika status bukan pending", async () => {
    await expect(
      rejectTransfer({ ...baseTransfer, status: "rejected" }, "alasan", { email: "lain@deera.id" }),
    ).rejects.toThrow("Transfer sudah tidak bisa di-reject.");
  });

  it("melempar error jika user mencoba reject transfer buatannya sendiri", async () => {
    await expect(
      rejectTransfer(baseTransfer, "alasan", { email: "pembuat@deera.id" }),
    ).rejects.toThrow(/Tidak bisa menolak transfer/);
  });

  it("melempar error saat update gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ error: new Error("reject gagal") }));
    await expect(
      rejectTransfer(baseTransfer, "alasan", { email: "lain@deera.id" }),
    ).rejects.toThrow("reject gagal");
  });

  it("sukses dengan alasan -> notes diawali [DITOLAK]", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await rejectTransfer(baseTransfer, "Barang tidak sesuai", { email: "lain@deera.id" });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        rejected_by: "lain@deera.id",
        notes: "[DITOLAK] Barang tidak sesuai",
      }),
    );
  });

  it("sukses tanpa alasan -> notes tetap memakai notes lama, rejected_by null tanpa user", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await rejectTransfer(baseTransfer, "", undefined);

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Notes lama", rejected_by: null }),
    );
  });

  it("logTransfer gagal total (forced) -> .catch(() => {}) tetap dieksekusi", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    getCurrentUser.mockRejectedValueOnce(new Error("auth down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      throw new Error("warn gagal");
    });

    await rejectTransfer(baseTransfer, "alasan", { email: "lain@deera.id" });

    await new Promise((resolve) => setTimeout(resolve, 0));
    warnSpy.mockRestore();
  });
});

describe("deleteTransfer", () => {
  it("sukses menghapus transfer berdasarkan id", async () => {
    const builder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(builder);

    await deleteTransfer({ id: "tr3" });

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "tr3");
  });

  it("melempar error saat delete gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ error: new Error("delete gagal") }));
    await expect(deleteTransfer({ id: "tr3" })).rejects.toThrow("delete gagal");
  });
});

describe("updateTransfer", () => {
  const pendingTransfer = { id: "tr4", status: "pending" };

  it("melempar error jika status bukan pending", async () => {
    await expect(
      updateTransfer(
        { ...pendingTransfer, status: "approved" },
        { fromLocation: "gudang", toLocation: "cideng", items: [{ kode: "D-01-OSK" }] },
      ),
    ).rejects.toThrow("Hanya transfer pending yang bisa diedit.");
  });

  it("melempar error jika fromLocation === toLocation", async () => {
    await expect(
      updateTransfer(pendingTransfer, {
        fromLocation: "gudang",
        toLocation: "gudang",
        items: [{ kode: "D-01-OSK" }],
      }),
    ).rejects.toThrow("Dari dan tujuan tidak boleh sama.");
  });

  it("melempar error jika items kosong", async () => {
    await expect(
      updateTransfer(pendingTransfer, { fromLocation: "gudang", toLocation: "cideng", items: [] }),
    ).rejects.toThrow("Pilih minimal satu item.");
  });

  it("melempar error jika items tidak diberikan", async () => {
    await expect(
      updateTransfer(pendingTransfer, { fromLocation: "gudang", toLocation: "cideng" }),
    ).rejects.toThrow("Pilih minimal satu item.");
  });

  it("sukses mengupdate transfer dengan notes diisi", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await updateTransfer(pendingTransfer, {
      fromLocation: "gudang",
      toLocation: "cideng",
      items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 1 }],
      notes: "Edit catatan",
    });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        from_location: "gudang",
        to_location: "cideng",
        notes: "Edit catatan",
      }),
    );
  });

  it("notes falsy -> disimpan sebagai null", async () => {
    const updateBuilder = makeBuilder({ error: null });
    supabaseMock.from.mockReturnValueOnce(updateBuilder);

    await updateTransfer(pendingTransfer, {
      fromLocation: "gudang",
      toLocation: "cideng",
      items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 1 }],
      notes: "",
    });

    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ notes: null }));
  });

  it("melempar error saat update gagal", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ error: new Error("update gagal") }));

    await expect(
      updateTransfer(pendingTransfer, {
        fromLocation: "gudang",
        toLocation: "cideng",
        items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 1 }],
      }),
    ).rejects.toThrow("update gagal");
  });
});
