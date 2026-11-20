import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  makeBuilder,
  resetSupabaseMock,
} from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { logHistory, fetchHistory, fetchHistoryByKode, deleteHistoryEntry } = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

// log_history: identitas dulu dari getCurrentUser() di JS lalu dikirim sbg
// payload insert client -> spoofable lewat REST langsung. Sekarang 1 RPC,
// identitas dari auth.uid() -> profiles di DB -- lihat
// supabase/migrations/20261120_history_pengiriman_crud.sql.
describe("logHistory", () => {
  it("memanggil RPC log_history dengan parameter yang benar", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: null });

    await logHistory({
      action: "tambah",
      category: "produk",
      kode: "D-01-OSK",
      nama: "Gamis A",
      snapshot: { x: 1 },
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("log_history", {
      p_action: "tambah",
      p_category: "produk",
      p_kode: "D-01-OSK",
      p_nama: "Gamis A",
      p_snapshot: { x: 1 },
      p_before: null,
    });
  });

  it("meneruskan before ke p_before jika diberikan", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: null });

    await logHistory({
      action: "edit",
      category: "produk",
      kode: "D-02",
      nama: "B",
      snapshot: {},
      before: { x: 0 },
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "log_history",
      expect.objectContaining({ p_before: { x: 0 } }),
    );
  });

  it("tidak melempar error jika RPC gagal/throw (best-effort)", async () => {
    supabaseMock.rpc.mockRejectedValueOnce(new Error("network error"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      logHistory({ action: "hapus", category: "produk", kode: "D-03", nama: "C", snapshot: {} }),
    ).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith("logHistory error:", expect.any(Error));
    warnSpy.mockRestore();
  });

  it("tidak melempar error jika RPC mengembalikan error object (best-effort)", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: { message: "boom" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      logHistory({ action: "x", category: "produk", kode: "X", nama: "Y", snapshot: {} }),
    ).resolves.not.toThrow();
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
