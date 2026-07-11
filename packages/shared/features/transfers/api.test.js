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

// approveTransfer sekarang murni memanggil RPC Postgres `approve_transfer`
// (Migration Phase 1) — seluruh validasi (status pending, self-approve),
// pemindahan stok per item, dan pencatatan riwayat berjalan atomik di
// server. Test di sini fokus pada kontrak pemanggilan RPC dari sisi
// client: parameter yang dikirim benar, dan error dari RPC (apa pun
// pesannya — divalidasi di server) diteruskan sebagai Error ke caller.
describe("approveTransfer", () => {
  const baseTransfer = {
    id: "tr1",
    status: "pending",
    from_location: "gudang",
    to_location: "cideng",
    created_by: "pembuat@deera.id",
    items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 5 }],
  };

  it("memanggil rpc('approve_transfer', ...) dengan parameter yang benar", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await approveTransfer(baseTransfer, {
      email: "lain@deera.id",
      user_metadata: { full_name: "Admin Lain" },
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("approve_transfer", {
      p_transfer_id: "tr1",
      p_approver_email: "lain@deera.id",
      p_approver_name: "ADMIN LAIN",
    });
  });

  it("tanpa user -> p_approver_email null, p_approver_name '-'", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await approveTransfer(baseTransfer, undefined);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("approve_transfer", {
      p_transfer_id: "tr1",
      p_approver_email: null,
      p_approver_name: "-",
    });
  });

  it("sukses -> tidak melempar error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await expect(approveTransfer(baseTransfer, { email: "lain@deera.id" })).resolves.toBeUndefined();
  });

  it("RPC menolak karena status bukan pending -> error diteruskan ke caller", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("Transfer sudah tidak bisa di-approve."),
    });

    await expect(
      approveTransfer({ ...baseTransfer, status: "approved" }, { email: "lain@deera.id" }),
    ).rejects.toThrow("Transfer sudah tidak bisa di-approve.");
  });

  it("RPC menolak self-approve -> error diteruskan ke caller", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error(
        "Tidak bisa menyetujui transfer yang Anda buat sendiri. Minta admin lain untuk approve.",
      ),
    });

    await expect(
      approveTransfer(baseTransfer, { email: "pembuat@deera.id" }),
    ).rejects.toThrow(/Tidak bisa menyetujui transfer/);
  });

  it("RPC gagal karena alasan lain (mis. koneksi) -> tetap dilempar sebagai Error", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("connection error"),
    });

    await expect(
      approveTransfer(baseTransfer, { email: "lain@deera.id" }),
    ).rejects.toThrow("connection error");
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
