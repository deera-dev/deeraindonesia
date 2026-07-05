import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select","eq","order","gte","lte","update","insert","delete","in","single","maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

import { supabase } from "@deera/shared/lib/supabase";
import { fetchKaryawanAktif, fetchKaryawanAll, saveKaryawan, toggleKaryawanAktif } from "./api";

const chain = supabase._chain;

beforeEach(() => { vi.clearAllMocks(); });

describe("fetchKaryawanAktif", () => {
  it("returns data array on success", async () => {
    chain.then = (resolve) => resolve({ data: [{ id: "k1", aktif: true }], error: null });
    const res = await fetchKaryawanAktif();
    expect(res).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("karyawan");
    expect(chain.eq).toHaveBeenCalledWith("aktif", true);
  });
  it("returns empty array when data is null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchKaryawanAktif()).toEqual([]);
  });
  it("throws when error is returned", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("db fail") });
    await expect(fetchKaryawanAktif()).rejects.toThrow("db fail");
  });
});

describe("fetchKaryawanAll", () => {
  it("returns data on success", async () => {
    chain.then = (resolve) => resolve({ data: [{ id: "k1" }, { id: "k2" }], error: null });
    const res = await fetchKaryawanAll();
    expect(res).toHaveLength(2);
  });
  it("returns empty array when data is null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchKaryawanAll()).toEqual([]);
  });
  it("throws when error is returned", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fail") });
    await expect(fetchKaryawanAll()).rejects.toThrow("fail");
  });
});

describe("saveKaryawan — insert", () => {
  it("calls insert when editing is null", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await saveKaryawan({ payload: { nama: "BUDI" }, editing: null });
    expect(chain.insert).toHaveBeenCalledWith({ nama: "BUDI" });
  });
  it("throws when insert returns error", async () => {
    chain.then = (resolve) => resolve({ error: new Error("dup") });
    await expect(saveKaryawan({ payload: {}, editing: null })).rejects.toThrow("dup");
  });
});

describe("saveKaryawan — update", () => {
  it("calls update when editing is provided", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await saveKaryawan({ payload: { nama: "BUDI" }, editing: { id: "k1" } });
    expect(chain.update).toHaveBeenCalledWith({ nama: "BUDI" });
    expect(chain.eq).toHaveBeenCalledWith("id", "k1");
  });
  it("throws when update returns error", async () => {
    chain.then = (resolve) => resolve({ error: new Error("nope") });
    await expect(saveKaryawan({ payload: {}, editing: { id: "k1" } })).rejects.toThrow("nope");
  });
});

describe("toggleKaryawanAktif", () => {
  it("toggles aktif status to false", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await toggleKaryawanAktif({ id: "k1", aktif: true });
    expect(chain.update).toHaveBeenCalledWith({ aktif: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "k1");
  });
  it("toggles aktif status to true", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await toggleKaryawanAktif({ id: "k1", aktif: false });
    expect(chain.update).toHaveBeenCalledWith({ aktif: true });
  });
  it("throws when error is returned", async () => {
    chain.then = (resolve) => resolve({ error: new Error("fail") });
    await expect(toggleKaryawanAktif({ id: "k1", aktif: false })).rejects.toThrow("fail");
  });
});
