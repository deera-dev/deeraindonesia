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
import { addPelanggan, updatePelanggan, deletePelanggan } from "./api";

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
