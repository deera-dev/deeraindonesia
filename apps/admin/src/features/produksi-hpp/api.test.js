import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("../history/api", () => ({ logHistory: vi.fn().mockResolvedValue(undefined) }));

import { supabase } from "@deera/shared/lib/supabase";
import {
  fetchHppTemplates, fetchHppConfig, fetchHppConfigRows,
  fetchBahanOptions, saveHppTemplates, deleteHppTemplate, saveHppConfigValue,
} from "./api";

// Chain where order() is the terminal (fetchHppTemplates, fetchHppConfigRows, fetchBahanOptions)
function makeOrderChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue(returnVal),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    throwOnError: vi.fn().mockResolvedValue(returnVal),
  };
}

// Chain where select() is the terminal (fetchHppConfig)
function makeSelectChain(returnVal = { data: [], error: null }) {
  const c = makeOrderChain(returnVal);
  c.select.mockResolvedValue(returnVal);
  return c;
}

// Chain where eq() is the terminal (delete, saveHppConfigValue, products.update)
function makeEqChain(returnVal = { data: null, error: null }) {
  const c = makeOrderChain(returnVal);
  c.eq.mockResolvedValue(returnVal);
  return c;
}

beforeEach(() => vi.clearAllMocks());

describe("fetchHppTemplates", () => {
  it("returns data array", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: [{ id: "1" }] }));
    const r = await fetchHppTemplates();
    expect(r).toEqual([{ id: "1" }]);
  });
  it("returns [] on null", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null }));
    expect(await fetchHppTemplates()).toEqual([]);
  });
});

describe("fetchHppConfig", () => {
  it("returns key->nilai map", async () => {
    supabase.from.mockReturnValue(makeSelectChain({ data: [{ key: "plastik", nilai: 1800 }, { key: "hangtag", nilai: 200 }] }));
    const r = await fetchHppConfig();
    expect(r.plastik).toBe(1800);
    expect(r.hangtag).toBe(200);
  });
  it("returns {} on null data", async () => {
    supabase.from.mockReturnValue(makeSelectChain({ data: null }));
    expect(await fetchHppConfig()).toEqual({});
  });
});

describe("fetchHppConfigRows", () => {
  it("returns rows", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: [{ key: "plastik" }] }));
    const r = await fetchHppConfigRows();
    expect(r[0].key).toBe("plastik");
  });
  it("returns [] on null", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null }));
    expect(await fetchHppConfigRows()).toEqual([]);
  });
});

describe("fetchBahanOptions", () => {
  it("merges beli and pinjam with _type labels", async () => {
    const beliChain  = makeOrderChain({ data: [{ id: "1", nama_bahan: "Wolfis", kode_bahan: null, satuan: "yard", harga_satuan: 10000, jumlah: 5 }] });
    const pinjamChain = makeOrderChain({ data: [{ id: "2", nama_bahan: "Sifon", kode_bahan: "SFN", satuan: "meter", harga_satuan: 5000, jumlah: 3 }] });
    supabase.from
      .mockReturnValueOnce(beliChain)
      .mockReturnValueOnce(pinjamChain);
    const r = await fetchBahanOptions();
    expect(r[0]._type).toBe("beli");
    expect(r[1]._type).toBe("pinjam");
    expect(r[1]._label).toContain("[Pinjam] Sifon");
  });
});

describe("saveHppTemplates", () => {
  it("inserts when no existing template for kode_produk", async () => {
    const hppChain = makeOrderChain();
    const prodChain = makeEqChain();
    supabase.from
      .mockReturnValueOnce(hppChain)
      .mockReturnValueOnce(prodChain);
    await saveHppTemplates(
      [{ kode_produk: "D-01-OSK", total_hpp: 50000, bahan_items: [] }],
      { templates: [], userEmail: "a@b.com" }
    );
    expect(hppChain.insert).toHaveBeenCalled();
  });
  it("updates when existing template found", async () => {
    const hppChain = makeOrderChain();
    const prodChain = makeEqChain();
    supabase.from
      .mockReturnValueOnce(hppChain)
      .mockReturnValueOnce(prodChain);
    await saveHppTemplates(
      [{ kode_produk: "D-01-OSK", total_hpp: 60000, bahan_items: [] }],
      { templates: [{ id: "t1", kode_produk: "D-01-OSK", total_hpp: 50000 }], userEmail: "a@b.com" }
    );
    expect(hppChain.update).toHaveBeenCalled();
  });
  it("also updates products.hpp", async () => {
    const hppChain = makeOrderChain();
    const prodChain = makeEqChain();
    supabase.from
      .mockReturnValueOnce(hppChain)
      .mockReturnValueOnce(prodChain);
    await saveHppTemplates(
      [{ kode_produk: "D-02-SFN", total_hpp: 70000, bahan_items: [] }],
      { templates: [], userEmail: "a@b.com" }
    );
    expect(supabase.from).toHaveBeenCalledWith("products");
  });
  it("returns count of payloads processed", async () => {
    supabase.from.mockReturnValue(makeEqChain());
    const n = await saveHppTemplates(
      [
        { kode_produk: "D-03-OSK", total_hpp: 1000, bahan_items: [] },
        { kode_produk: "D-04-OSK", total_hpp: 2000, bahan_items: [] },
      ],
      { templates: [], userEmail: "x@y.com" }
    );
    expect(n).toBe(2);
  });
});

describe("deleteHppTemplate", () => {
  it("calls delete on hpp_template", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    await deleteHppTemplate({ id: "t1", kode_produk: "D-01-OSK", total_hpp: 50000 });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "t1");
  });
});

describe("saveHppConfigValue", () => {
  it("calls update on hpp_config", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    await saveHppConfigValue("plastik", 2000, "admin@deera.id");
    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("key", "plastik");
  });
});
