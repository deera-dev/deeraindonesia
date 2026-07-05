import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select","eq","order","gte","lte","update","insert","delete","in","gt","single","maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

import { supabase } from "@deera/shared/lib/supabase";
import {
  fetchKasbonAll,
  createOrAccumulateKasbon,
  updateKasbonJumlah,
  deleteKasbon,
  payCicilan,
  getKasbonBelumLunasByKaryawanIds,
  applyKasbonDeductionFromGajian,
} from "./api";

const chain = supabase._chain;
beforeEach(() => { vi.clearAllMocks(); });

describe("fetchKasbonAll", () => {
  it("returns data array", async () => {
    chain.then = (resolve) => resolve({ data: [{ id: "kb1" }], error: null });
    const res = await fetchKasbonAll();
    expect(res).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("kasbon");
  });
  it("returns empty when data null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchKasbonAll()).toEqual([]);
  });
});

describe("createOrAccumulateKasbon — insert new", () => {
  it("calls insert when no existing belum", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 100000, keterangan: "bon", existingRows: [] });
    expect(chain.insert).toHaveBeenCalled();
  });
  it("throws on insert error", async () => {
    chain.then = (resolve, reject) => reject(new Error("dup"));
    await expect(createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 0, existingRows: [] })).rejects.toThrow();
  });
});

describe("createOrAccumulateKasbon — accumulate", () => {
  it("calls update when existing belum found", async () => {
    chain.then = (resolve) => resolve({ error: null });
    const existing = [{ id: "kb1", karyawan_id: "k1", status: "belum", jumlah: 50000, sisa: 50000, tambahan: [], karyawan: { nama: "BUDI" } }];
    const result = await createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 30000, keterangan: "bon2", existingRows: existing });
    expect(result.accumulated).toBe(true);
    expect(chain.update).toHaveBeenCalled();
  });
});

describe("updateKasbonJumlah", () => {
  it("updates with correct newSisa", async () => {
    chain.then = (resolve) => resolve({ error: null });
    // jumlah=100000, totalDibayar= 100000-60000=40000, newSisa=100000-40000=60000
    const result = await updateKasbonJumlah({
      initial: { id: "kb1", jumlah: 100000, sisa: 60000 },
      jumlah: 100000, tanggal: "2026-07-01", keterangan: "edit",
    });
    expect(result.newSisa).toBe(60000);
    expect(result.newStatus).toBe("belum");
  });
  it("sets status lunas when newSisa <= 0", async () => {
    chain.then = (resolve) => resolve({ error: null });
    // initial.jumlah=100000, initial.sisa=50000 → totalDibayar=50000
    // jumlah=50000 → newSisa=50000-50000=0 → "lunas"
    const result = await updateKasbonJumlah({
      initial: { id: "kb1", jumlah: 100000, sisa: 50000 },
      jumlah: 50000, tanggal: "2026-07-01",
    });
    expect(result.newSisa).toBe(0);
    expect(result.newStatus).toBe("lunas");
  });
});

describe("deleteKasbon", () => {
  it("calls delete with id", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deleteKasbon("kb1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "kb1");
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("fail"));
    await expect(deleteKasbon("kb1")).rejects.toThrow();
  });
});

describe("payCicilan", () => {
  it("computes new sisa and status correctly", async () => {
    chain.then = (resolve) => resolve({ error: null });
    const kasbon = { id: "kb1", sisa: 100000, cicilan: [] };
    const result = await payCicilan({ kasbon, jumlah: 100000, tanggal: "2026-07-01", keterangan: "lunas" });
    expect(result.newSisa).toBe(0);
    expect(result.newStatus).toBe("lunas");
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("err"));
    await expect(payCicilan({ kasbon: { id: "kb1", sisa: 0, cicilan: [] }, jumlah: 0, tanggal: "", keterangan: "" })).rejects.toThrow();
  });
});

describe("getKasbonBelumLunasByKaryawanIds", () => {
  it("returns empty when ids empty", async () => {
    const res = await getKasbonBelumLunasByKaryawanIds([]);
    expect(res).toEqual([]);
  });
  it("queries kasbon with ids", async () => {
    chain.then = (resolve) => resolve({ data: [{ id: "kb1" }], error: null });
    const res = await getKasbonBelumLunasByKaryawanIds(["k1"]);
    expect(res).toHaveLength(1);
  });
});

describe("applyKasbonDeductionFromGajian", () => {
  it("applies deduction and updates record", async () => {
    chain.then = (resolve) => resolve({ error: null });
    const kasbonRow = { id: "kb1", sisa: 100000, cicilan: [] };
    await applyKasbonDeductionFromGajian(kasbonRow, { jumlah: 50000, tanggal: "2026-07-01", keterangan: "gajian" });
    expect(chain.update).toHaveBeenCalled();
  });
});

// ─── Error branches via response object + null branches ───────────────────────
describe("kasbon/api — if(error) branches + null branches", () => {
  it("fetchKasbonAll throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fetch fail") });
    await expect(fetchKasbonAll()).rejects.toThrow("fetch fail");
  });

  it("createOrAccumulateKasbon insert throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("insert fail") });
    await expect(createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 100, existingRows: [] })).rejects.toThrow("insert fail");
  });

  it("createOrAccumulateKasbon accumulate throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("update fail") });
    const existing = [{ id: "kb1", karyawan_id: "k1", status: "belum", jumlah: 50000, sisa: 50000, tambahan: [], karyawan: null }];
    await expect(createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 100, existingRows: existing })).rejects.toThrow("update fail");
  });

  it("createOrAccumulateKasbon accumulate covers ?? [] and karyawan null", async () => {
    chain.then = (resolve) => resolve({ error: null });
    // tambahan: undefined → existingBelum.tambahan ?? [] covers branch5[1]
    // karyawan: null → karyawan?.nama ?? "" covers branch7[1]
    const existing = [{ id: "kb1", karyawan_id: "k1", status: "belum", jumlah: 50000, sisa: 50000, tambahan: undefined, karyawan: null }];
    const result = await createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 100, existingRows: existing });
    expect(result.accumulated).toBe(true);
    expect(result.karyawanNama).toBe("");
  });

  it("createOrAccumulateKasbon with null existingRows (?? [] branch)", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await createOrAccumulateKasbon({ karyawanId: "k1", tanggal: "2026-07-01", jumlah: 100, existingRows: null });
    expect(chain.insert).toHaveBeenCalled();
  });

  it("updateKasbonJumlah throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("upd fail") });
    await expect(updateKasbonJumlah({ initial: { id: "kb1", jumlah: 100, sisa: 50 }, jumlah: 100, tanggal: "2026-07-01" })).rejects.toThrow("upd fail");
  });

  it("updateKasbonJumlah covers keterangan ?? branch (undefined)", async () => {
    chain.then = (resolve) => resolve({ error: null });
    // keterangan: undefined — covers `keterangan ?? initial?.keterangan ?? null`
    const result = await updateKasbonJumlah({ initial: { id: "kb1", jumlah: 100, sisa: 100, keterangan: "prev" }, jumlah: 100, tanggal: "2026-07-01", keterangan: undefined });
    expect(result).toBeDefined();
  });

  it("deleteKasbon throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("del fail") });
    await expect(deleteKasbon("kb1")).rejects.toThrow("del fail");
  });

  it("payCicilan throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("pay fail") });
    await expect(payCicilan({ kasbon: { id: "kb1", sisa: 100, cicilan: [] }, jumlah: 50, tanggal: "2026-07-01", keterangan: "" })).rejects.toThrow("pay fail");
  });

  it("payCicilan covers cicilan ?? [] when cicilan is undefined", async () => {
    chain.then = (resolve) => resolve({ error: null });
    const result = await payCicilan({ kasbon: { id: "kb1", sisa: 100, cicilan: undefined }, jumlah: 50, tanggal: "2026-07-01", keterangan: "" });
    expect(result.newSisa).toBe(50);
  });

  it("getKasbonBelumLunasByKaryawanIds throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("err") });
    await expect(getKasbonBelumLunasByKaryawanIds(["k1"])).rejects.toThrow("err");
  });

  it("getKasbonBelumLunasByKaryawanIds returns [] when data null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await getKasbonBelumLunasByKaryawanIds(["k1"])).toEqual([]);
  });

  it("getKasbonBelumLunasByKaryawanIds returns [] when ids is null", async () => {
    expect(await getKasbonBelumLunasByKaryawanIds(null)).toEqual([]);
  });

  it("applyKasbonDeductionFromGajian throws on response.error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("apply fail") });
    await expect(applyKasbonDeductionFromGajian({ id: "kb1", sisa: 100, cicilan: [] }, { jumlah: 50, tanggal: "2026-07-01", keterangan: "" })).rejects.toThrow("apply fail");
  });

  it("applyKasbonDeductionFromGajian covers cicilan ?? [] and newSisa===0", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await applyKasbonDeductionFromGajian({ id: "kb1", sisa: 100, cicilan: undefined }, { jumlah: 100, tanggal: "2026-07-01", keterangan: "" });
    expect(chain.update).toHaveBeenCalled();
  });
});

describe("updateKasbonJumlah — keterangan ?? null (third ?? branch)", () => {
  it("uses null when both keterangan and initial.keterangan are undefined", async () => {
    chain.then = (resolve) => resolve({ error: null });
    // keterangan=undefined + initial has no keterangan → ?? null result
    const result = await updateKasbonJumlah({
      initial: { id: "kb1", jumlah: 100, sisa: 100 },
      jumlah: 100,
      tanggal: "2026-07-01",
      keterangan: undefined,
    });
    expect(result.newSisa).toBe(100); // jumlah(100) - totalDibayar(0) = 100
  });
});
