import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("../history/api", () => ({ logHistory: vi.fn().mockResolvedValue(undefined) }));

import { supabase } from "@deera/shared/lib/supabase";
import {
  deleteHppTemplate,
  fetchBahanOptions,
  fetchHppConfig,
  fetchHppConfigRows,
  fetchHppTemplates,
  saveHppConfigValue,
  saveHppTemplates,
} from "./api";

function makeOrderChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(returnVal),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    throwOnError: vi.fn().mockResolvedValue(returnVal),
  };
}

function makeSelectChain(returnVal = { data: [], error: null }) {
  const c = makeOrderChain(returnVal);
  c.select.mockResolvedValue(returnVal);
  return c;
}

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
    supabase.from.mockReturnValue(
      makeSelectChain({
        data: [
          { key: "plastik", nilai: 1800 },
          { key: "hangtag", nilai: 200 },
        ],
      }),
    );
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
    const beliChain = makeOrderChain({
      data: [
        {
          id: "1",
          nama_bahan: "Wolfis",
          kode_bahan: null,
          satuan: "yard",
          harga_satuan: 10000,
          jumlah: 5,
        },
      ],
    });
    const pinjamChain = makeOrderChain({
      data: [
        {
          id: "2",
          nama_bahan: "Sifon",
          kode_bahan: "SFN",
          satuan: "meter",
          harga_satuan: 5000,
          jumlah: 3,
        },
      ],
    });
    supabase.from.mockReturnValueOnce(beliChain).mockReturnValueOnce(pinjamChain);
    const r = await fetchBahanOptions();
    expect(r[0]._type).toBe("beli");
    expect(r[1]._type).toBe("pinjam");
    expect(r[1]._label).toContain("[Pinjam] Sifon");
  });
});

describe("saveHppTemplates", () => {
  // Upsert hpp_template + sync products.hpp + lookup existing-by-kode
  // sekarang 1 RPC atomik di server (save_hpp_template) — lihat
  // supabase/migrations/20261120_save_hpp_template_config.sql.
  it("memanggil save_hpp_template per payload dengan field yang benar", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await saveHppTemplates([{ kode_produk: "D-01-OSK", total_hpp: 50000, bahan_items: [] }]);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "save_hpp_template",
      expect.objectContaining({ p_kode_produk: "D-01-OSK", p_total_hpp: 50000 }),
    );
  });
  it("throw kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "boom" } });
    await expect(
      saveHppTemplates([{ kode_produk: "D-01-OSK", total_hpp: 50000, bahan_items: [] }]),
    ).rejects.toThrow("boom");
  });
  it("returns count of payloads processed", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    const n = await saveHppTemplates([
      { kode_produk: "D-03-OSK", total_hpp: 1000, bahan_items: [] },
      { kode_produk: "D-04-OSK", total_hpp: 2000, bahan_items: [] },
    ]);
    expect(n).toBe(2);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
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
  // Identitas (updated_by) diambil RPC dari auth.uid() -> profiles,
  // bukan parameter client lagi.
  it("memanggil save_hpp_config_value dengan key & nilai", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await saveHppConfigValue("plastik", 2000);
    expect(supabase.rpc).toHaveBeenCalledWith("save_hpp_config_value", {
      p_key: "plastik",
      p_nilai: 2000,
    });
  });
  it("throw kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "boom" } });
    await expect(saveHppConfigValue("plastik", 2000)).rejects.toThrow("boom");
  });
});
