import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchKeepOrders, createKeepOrder, markKeepPaid, cancelKeep } = await import("./api");

beforeEach(() => resetSupabaseMock(supabaseMock));

describe("fetchKeepOrders", () => {
  it("hanya yang aktif, terbaru dulu", async () => {
    const b = makeBuilder({ data: [{ id: "1" }], error: null });
    supabaseMock.from.mockReturnValueOnce(b);
    expect(await fetchKeepOrders()).toEqual([{ id: "1" }]);
    expect(supabaseMock.from).toHaveBeenCalledWith("keep_orders");
    expect(b.eq).toHaveBeenCalledWith("status", "aktif");
  });
});

describe("createKeepOrder", () => {
  it("tolak pesanan kosong tanpa menyentuh Supabase", async () => {
    await expect(createKeepOrder({ items: [] })).rejects.toThrow(/kosong/);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
  it("insert dgn status aktif, nama/hp di-trim, pembuat tercatat", async () => {
    const b = makeBuilder({ data: { id: "k1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(b);
    await createKeepOrder({
      items: [{ kode: "A", qty: 1 }],
      total: 100000,
      discount: 0,
      buyerName: "  Budi ",
      buyerHp: "",
      location: "cideng",
      user: { email: "a@b.c", name: "Kasir" },
    });
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "aktif", buyer_name: "Budi", buyer_hp: null, total: 100000, location: "cideng", created_by_email: "a@b.c", created_by_name: "Kasir" }),
    );
  });
});

describe("markKeepPaid / cancelKeep", () => {
  it("lunas: status + paid_at", async () => {
    const b = makeBuilder({ data: { id: "k1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(b);
    await markKeepPaid("k1");
    expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ status: "lunas", paid_at: expect.any(String) }));
    expect(b.eq).toHaveBeenCalledWith("id", "k1");
  });
  it("batal: status batal; id kosong ditolak; error dilempar", async () => {
    const b = makeBuilder({ data: { id: "k1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(b);
    await cancelKeep("k1");
    expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ status: "batal" }));
    await expect(cancelKeep("")).rejects.toThrow(/id/);
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error("boom") }));
    await expect(cancelKeep("k2")).rejects.toThrow("boom");
  });
});
