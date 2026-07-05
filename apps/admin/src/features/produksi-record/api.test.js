import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("../history/api", () => ({ logHistory: vi.fn().mockResolvedValue(undefined) }));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchBatches, fetchHppTemplate, deleteBatchAndProduct, createBatches, updateBatch } from "./api";

// Base chain — all methods mockReturnThis by default
function makeBase() {
  return {
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    throwOnError: vi.fn().mockReturnThis(),
  };
}

// Terminal: order()  — fetchBatches
function makeOrderChain(data = [], error = null) {
  const c = makeBase();
  c.order.mockResolvedValue({ data, error });
  return c;
}

// Terminal: single() — fetchHppTemplate (eq stays mockReturnThis so single() is reachable)
function makeSingleChain(data, error = null) {
  const c = makeBase();
  c.single.mockResolvedValue({ data, error });
  return c;
}

// Terminal: eq() — delete / update chains
function makeEqChain(data = null, error = null) {
  const c = makeBase();
  c.eq.mockResolvedValue({ data, error });
  return c;
}

// Terminal: upsert() / insert() — createBatches
function makeUpsertChain(data = null, error = null) {
  const c = makeBase();
  c.upsert.mockResolvedValue({ data, error });
  c.insert.mockResolvedValue({ data, error });
  return c;
}

beforeEach(() => vi.clearAllMocks());

describe("fetchBatches", () => {
  it("returns data", async () => {
    supabase.from.mockReturnValue(makeOrderChain([{ id: "b1" }]));
    expect(await fetchBatches()).toEqual([{ id: "b1" }]);
  });
  it("returns [] on null", async () => {
    supabase.from.mockReturnValue(makeOrderChain(null));
    expect(await fetchBatches()).toEqual([]);
  });
});

describe("fetchHppTemplate", () => {
  it("returns null for null kode", async () => {
    expect(await fetchHppTemplate(null)).toBeNull();
  });
  it("fetches by kode_produk", async () => {
    supabase.from.mockReturnValue(makeSingleChain({ id: "t1" }));
    expect(await fetchHppTemplate("D-01-OSK")).toEqual({ id: "t1" });
  });
  it("returns null when data null", async () => {
    supabase.from.mockReturnValue(makeSingleChain(null));
    expect(await fetchHppTemplate("D-01-OSK")).toBeNull();
  });
});

describe("deleteBatchAndProduct", () => {
  it("calls delete on multiple tables", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    await deleteBatchAndProduct({ kode_produk: "D-01-OSK", nama_produk: "Gamis" });
    expect(supabase.from).toHaveBeenCalledWith("produksi_batch");
    expect(supabase.from).toHaveBeenCalledWith("products");
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe("createBatches", () => {
  it("upserts products and inserts batch for each entry", async () => {
    const chain = makeUpsertChain();
    supabase.from.mockReturnValue(chain);
    const entry = {
      kode: "D-01-OSK", nama: "Gamis", bahan: "OSK",
      activeVariants: [{ size: "Midi", ld: 110, pb: 130 }],
      warnaList: ["HITAM"],
      sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }],
      totalKain: 5, template: null, batchNo: "PROD-20240101-123",
      tanggal: "2024-01-01", catatan: "",
    };
    await createBatches([entry], {});
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("throws when products upsert errors", async () => {
    const chain = makeUpsertChain(null, null);
    chain.upsert.mockResolvedValue({ error: new Error("upsert fail") });
    supabase.from.mockReturnValue(chain);
    const entry = {
      kode: "D-01-OSK", nama: "Gamis", bahan: "OSK",
      activeVariants: [], warnaList: [],
      sizes: [], totalKain: 0, template: null,
      batchNo: "PROD-X", tanggal: "2024-01-01", catatan: "",
    };
    await expect(createBatches([entry], {})).rejects.toThrow("upsert fail");
  });
});

describe("updateBatch", () => {
  it("calls update on produksi_batch", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    const payload = {
      initial: { id: "b1", kode_produk: "D-01-OSK", batch_no: "PROD-OLD", tanggal_produksi: "2024-01-01", total_kain: 10 },
      kode: "D-01-OSK", nama: "Gamis", tanggal: "2024-01-15",
      totalKain: 12, sizes: [], bahanDipakai: [], batchNo: "PROD-NEW", catatan: "",
    };
    await updateBatch(payload, [], {});
    expect(chain.update).toHaveBeenCalled();
  });
});
