import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const getCurrentUserMock = vi.fn();
const displayNameMock = vi.fn();
vi.mock("@deera/shared/features/auth/api", () => ({
  getCurrentUser: (...a) => getCurrentUserMock(...a),
  displayName: (...a) => displayNameMock(...a),
}));

const { logHistory, fetchHistory, fetchHistoryByKode, deleteHistoryEntry } = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  getCurrentUserMock.mockReset();
  displayNameMock.mockReset();
});

describe("logHistory", () => {
  it("insert ke product_history dengan user_email & user_name dari auth", async () => {
    getCurrentUserMock.mockResolvedValue({ email: "admin@deera.id" });
    displayNameMock.mockReturnValue("Admin");
    const insertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(insertBuilder);

    await logHistory({ action: "tambah", category: "produk", kode: "D-01-OSK", nama: "Gamis A", snapshot: { x: 1 } });

    expect(supabaseMock.from).toHaveBeenCalledWith("product_history");
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tambah",
        category: "produk",
        kode: "D-01-OSK",
        nama: "Gamis A",
        snapshot: { x: 1 },
        before_snapshot: null,
        user_email: "admin@deera.id",
        user_name: "Admin",
      })
    );
  });

  it("meneruskan before ke before_snapshot jika diberikan", async () => {
    getCurrentUserMock.mockResolvedValue({ email: "a@b.id" });
    displayNameMock.mockReturnValue("A");
    const insertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(insertBuilder);

    await logHistory({ action: "edit", category: "produk", kode: "D-02", nama: "B", snapshot: {}, before: { x: 0 } });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ before_snapshot: { x: 0 } })
    );
  });

  it("tidak melempar error jika insert supabase gagal/throw (best-effort)", async () => {
    getCurrentUserMock.mockResolvedValue({ email: "a@b.id" });
    displayNameMock.mockReturnValue("A");
    // Simulasi exception nyata (bukan hanya error object) agar try-catch terpicu
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(logHistory({ action: "hapus", category: "produk", kode: "D-03", nama: "C", snapshot: {} })).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith("logHistory error:", expect.any(Error));
    warnSpy.mockRestore();
  });

  it("user null → user_email null & user_name dari displayName(null)", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    displayNameMock.mockReturnValue("Admin");
    const insertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(insertBuilder);

    await logHistory({ action: "tambah", category: "produk", kode: "X", nama: "Y", snapshot: {} });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_email: null, user_name: "Admin" })
    );
  });

  it("getCurrentUser throws → ditangkap, console.warn dipanggil", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("auth error"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(logHistory({ action: "x", category: "produk", kode: "X", nama: "Y", snapshot: {} })).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("fetchHistory", () => {
  it("mengambil history tanpa filter kategori/tanggal", async () => {
    const rows = [{ id: "1", action: "tambah" }];
    const builder = makeBuilder({ data: rows, error: null });
    supabaseMock.from.mockReturnValue(builder);

    const result = await fetchHistory();

    expect(supabaseMock.from).toHaveBeenCalledWith("product_history");
    expect(result).toBe(rows);
  });

  it("menambahkan filter eq category saat category !== 'all'", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValue(builder);

    await fetchHistory({ category: "produk" });

    expect(builder.eq).toHaveBeenCalledWith("category", "produk");
  });

  it("menambahkan gte/lte saat dateFrom/dateTo di-set", async () => {
    const builder = makeBuilder({ data: [], error: null });
    supabaseMock.from.mockReturnValue(builder);

    await fetchHistory({ dateFrom: "2026-06-01", dateTo: "2026-06-30" });

    expect(builder.gte).toHaveBeenCalledWith("changed_at", "2026-06-01T00:00:00");
    expect(builder.lte).toHaveBeenCalledWith("changed_at", "2026-06-30T23:59:59");
  });

  it("data null → mengembalikan []", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(builder);

    expect(await fetchHistory()).toEqual([]);
  });

  it("melempar error saat supabase error", async () => {
    const err = new Error("fail");
    const builder = makeBuilder({ data: null, error: err });
    supabaseMock.from.mockReturnValue(builder);

    await expect(fetchHistory()).rejects.toThrow("fail");
  });
});

describe("fetchHistoryByKode", () => {
  it("mengembalikan [] tanpa memanggil supabase saat kode falsy", async () => {
    expect(await fetchHistoryByKode(null)).toEqual([]);
    expect(await fetchHistoryByKode("")).toEqual([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("filter eq kode, urut changed_at ascending (lama->baru)", async () => {
    const rows = [{ id: "1", kode: "SPL-20260901-001" }];
    const builder = makeBuilder({ data: rows, error: null });
    supabaseMock.from.mockReturnValue(builder);

    const result = await fetchHistoryByKode("SPL-20260901-001");

    expect(supabaseMock.from).toHaveBeenCalledWith("product_history");
    expect(builder.eq).toHaveBeenCalledWith("kode", "SPL-20260901-001");
    expect(builder.order).toHaveBeenCalledWith("changed_at", { ascending: true });
    expect(result).toBe(rows);
  });

  it("data null -> mengembalikan []", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await fetchHistoryByKode("X")).toEqual([]);
  });

  it("melempar error saat supabase error", async () => {
    supabaseMock.from.mockReturnValue(makeBuilder({ data: null, error: new Error("fail") }));
    await expect(fetchHistoryByKode("X")).rejects.toThrow("fail");
  });
});

describe("deleteHistoryEntry", () => {
  it("menghapus baris dengan eq id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(builder);

    await deleteHistoryEntry("abc-123");

    expect(supabaseMock.from).toHaveBeenCalledWith("product_history");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "abc-123");
  });

  it("melempar error saat supabase error", async () => {
    const builder = makeBuilder({ data: null, error: new Error("delete fail") });
    supabaseMock.from.mockReturnValue(builder);

    await expect(deleteHistoryEntry("xyz")).rejects.toThrow("delete fail");
  });
});
