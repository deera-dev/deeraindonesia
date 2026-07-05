import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select","eq","order","update","insert","delete","in","single","maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

import { supabase } from "@deera/shared/lib/supabase";
import { fetchPettycashAll, savePettycash, deletePettycash } from "./api";

const chain = supabase._chain;
beforeEach(() => { vi.clearAllMocks(); });

describe("fetchPettycashAll", () => {
  it("returns data array", async () => {
    chain.then = (resolve) => resolve({ data: [{ id: "pc1" }], error: null });
    expect(await fetchPettycashAll()).toHaveLength(1);
  });
  it("returns empty array when data null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchPettycashAll()).toEqual([]);
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("fail"));
    await expect(fetchPettycashAll()).rejects.toThrow();
  });
});

describe("savePettycash — insert", () => {
  it("calls insert when editing null", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await savePettycash({ payload: { jenis: "isi" }, editing: null });
    expect(chain.insert).toHaveBeenCalledWith({ jenis: "isi" });
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("fail"));
    await expect(savePettycash({ payload: {}, editing: null })).rejects.toThrow();
  });
});

describe("savePettycash — update", () => {
  it("calls update when editing provided", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await savePettycash({ payload: { jenis: "keluar" }, editing: { id: "pc1" } });
    expect(chain.update).toHaveBeenCalledWith({ jenis: "keluar" });
    expect(chain.eq).toHaveBeenCalledWith("id", "pc1");
  });
});

describe("deletePettycash", () => {
  it("calls delete with id", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deletePettycash("pc1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "pc1");
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("fail"));
    await expect(deletePettycash("pc1")).rejects.toThrow();
  });
});

describe("fetchPettycashAll — error-via-resolve branch", () => {
  it("throws when error is truthy", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fetch fail") });
    await expect(fetchPettycashAll()).rejects.toThrow("fetch fail");
  });
});

describe("savePettycash — update error-via-resolve", () => {
  it("throws when error is truthy (update path)", async () => {
    chain.then = (resolve) => resolve({ error: new Error("update fail") });
    await expect(savePettycash({ payload: {}, editing: { id: "pc1" } })).rejects.toThrow("update fail");
  });
});

describe("savePettycash — insert error-via-resolve", () => {
  it("throws when error is truthy (insert path)", async () => {
    chain.then = (resolve) => resolve({ error: new Error("insert fail") });
    await expect(savePettycash({ payload: {}, editing: null })).rejects.toThrow("insert fail");
  });
});

describe("deletePettycash — error-via-resolve", () => {
  it("throws when error is truthy", async () => {
    chain.then = (resolve) => resolve({ error: new Error("delete fail") });
    await expect(deletePettycash("pc1")).rejects.toThrow("delete fail");
  });
});
