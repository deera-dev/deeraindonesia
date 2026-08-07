import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock("../../lib/db", () => ({
  db: {
    pelanggan: {
      put: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ id: "p1", nama: "BUDI", no_hp: "081" }),
    },
  },
}));
vi.mock("../riwayat/api", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { db } from "../../lib/db";
import { logActivity } from "../riwayat/api";
import { addPelanggan, updatePelanggan, deletePelanggan, fetchSalesByPelanggan, fetchSalesByBuyerName } from "./api";

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  db.pelanggan.put.mockResolvedValue(undefined);
  db.pelanggan.update.mockResolvedValue(1);
  db.pelanggan.delete.mockResolvedValue(undefined);
  db.pelanggan.get.mockResolvedValue({ id: "p1", nama: "BUDI" });
  supabase.from.mockReturnValue({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "p1", nama: "BUDI" }, error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    delete: vi.fn().mockReturnThis(),
  });
});

describe("addPelanggan", () => {
  it("inserts to supabase and db when online", async () => {
    const result = await addPelanggan({ nama: "BUDI", no_hp: "081", alamat: "" });
    expect(supabase.from).toHaveBeenCalledWith("pelanggan");
    expect(db.pelanggan.put).toHaveBeenCalled();
    expect(result.id).toBe("p1");
  });

  it("uses local uuid when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const result = await addPelanggan({ nama: "BUDI" });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(typeof result.id).toBe("string");
  });

  it("calls logActivity after adding", async () => {
    await addPelanggan({ nama: "BUDI" });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "pelanggan-tambah" }));
  });

  it("throws when supabase returns error", async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "rls denied" } }),
    });
    await expect(addPelanggan({ nama: "BUDI" })).rejects.toMatchObject({ message: "rls denied" });
  });
});

describe("updatePelanggan", () => {
  it("updates supabase and db when online", async () => {
    await updatePelanggan("p1", { nama: "BUDIMAN", no_hp: "082" });
    expect(db.pelanggan.update).toHaveBeenCalledWith("p1", expect.objectContaining({ nama: "BUDIMAN" }));
  });

  it("updates only db when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    await updatePelanggan("p1", { nama: "BUDIMAN" });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(db.pelanggan.update).toHaveBeenCalled();
  });

  it("calls logActivity with pelanggan-edit", async () => {
    await updatePelanggan("p1", { nama: "BUDIMAN" });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "pelanggan-edit" }));
  });
});

describe("deletePelanggan", () => {
  it("deletes from supabase and db when online", async () => {
    await deletePelanggan("p1");
    expect(db.pelanggan.delete).toHaveBeenCalledWith("p1");
  });

  it("deletes only from db when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    await deletePelanggan("p1");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(db.pelanggan.delete).toHaveBeenCalled();
  });

  it("calls logActivity with pelanggan-hapus", async () => {
    await deletePelanggan("p1");
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "pelanggan-hapus" }));
  });
});

describe("fetchSalesByPelanggan", () => {
  it("queries sales filtered by pelanggan_id, ordered by date/created_at desc", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: [{ id: "s1" }], error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const eq = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    const result = await fetchSalesByPelanggan("pel-1");

    expect(supabase.from).toHaveBeenCalledWith("sales");
    expect(select).toHaveBeenCalledWith(expect.stringContaining("stok_adjustments"));
    expect(eq).toHaveBeenCalledWith("pelanggan_id", "pel-1");
    expect(order1).toHaveBeenCalledWith("date", { ascending: false });
    expect(order2).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "s1" }]);
  });

  it("returns [] when data is null", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: null, error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const eq = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    const result = await fetchSalesByPelanggan("pel-1");
    expect(result).toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const eq = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    await expect(fetchSalesByPelanggan("pel-1")).rejects.toMatchObject({ message: "boom" });
  });
});

describe("fetchSalesByBuyerName", () => {
  it("queries sales by buyer_name using case-insensitive exact match (ilike, no wildcard)", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: [{ id: "s1" }], error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const ilike = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ ilike });
    supabase.from.mockReturnValue({ select });

    const result = await fetchSalesByBuyerName("HJ MIMI TEGAL");

    expect(supabase.from).toHaveBeenCalledWith("sales");
    expect(ilike).toHaveBeenCalledWith("buyer_name", "HJ MIMI TEGAL");
    expect(order1).toHaveBeenCalledWith("date", { ascending: false });
    expect(order2).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "s1" }]);
  });

  it("returns [] when data is null", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: null, error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const ilike = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ ilike });
    supabase.from.mockReturnValue({ select });

    const result = await fetchSalesByBuyerName("HJ MIMI TEGAL");
    expect(result).toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const ilike = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ ilike });
    supabase.from.mockReturnValue({ select });

    await expect(fetchSalesByBuyerName("HJ MIMI TEGAL")).rejects.toMatchObject({ message: "boom" });
  });
});
