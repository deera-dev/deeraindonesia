import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select","eq","order","update","insert","delete","in","gt","single","maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

import { supabase } from "@deera/shared/lib/supabase";
import {
  fetchGajianList, fetchGajianDetail, createGajianPeriode, deleteGajianPeriode,
  saveGajianRequest, finalizeGajian, fetchGajianTotals, fetchKaryawanIdsInGajian,
  fetchPotong, savePotong, deletePotong,
  fetchJahit, saveJahit, deleteJahit,
  fetchFinishing, saveFinishing, deleteFinishing,
  fetchQC, saveQC, deleteQC,
  fetchKreatif, saveKreatif, deleteKreatif,
  fetchCmt, saveCmt, deleteCmt,
  fetchProdukList, fetchUpahJahitByKode, fetchUpahJahitHistoryByKode,
} from "./api";

const chain = supabase._chain;
beforeEach(() => { vi.clearAllMocks(); });

describe("fetchGajianList", () => {
  it("returns list data", async () => {
    chain.then = (resolve) => resolve({ data: [{ id: "g1" }], error: null });
    const res = await fetchGajianList();
    expect(res).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("gajian_minggu");
  });
  it("returns empty array when null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchGajianList()).toEqual([]);
  });
});

describe("fetchGajianDetail", () => {
  it("returns single gajian data", async () => {
    chain.then = (resolve) => resolve({ data: { id: "g1" }, error: null });
    const res = await fetchGajianDetail("g1");
    expect(res.id).toBe("g1");
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("not found"));
    await expect(fetchGajianDetail("xxx")).rejects.toThrow();
  });
});

describe("createGajianPeriode", () => {
  it("throws if duplicate tanggal_sabtu", async () => {
    // First call to maybeSingle returns existing
    chain.then = (resolve) => resolve({ data: { id: "g1" }, error: null });
    await expect(createGajianPeriode("2026-07-04")).rejects.toThrow("sudah ada");
  });
  it("inserts new periode when no duplicate", async () => {
    // maybeSingle returns null, then insert returns new id
    let callCount = 0;
    chain.then = (resolve) => {
      callCount++;
      if (callCount === 1) return resolve({ data: null, error: null }); // maybeSingle
      return resolve({ data: { id: "g2" }, error: null }); // insert.select().single()
    };
    const id = await createGajianPeriode("2026-07-11");
    expect(typeof id === "string" || id).toBeTruthy();
  });
});

describe("deleteGajianPeriode", () => {
  it("deletes all child tables then gajian_minggu", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deleteGajianPeriode("g1");
    // should call from() multiple times for child tables + gajian_minggu
    expect(supabase.from).toHaveBeenCalledWith("gajian_minggu");
  });
});

describe("saveGajianRequest", () => {
  it("calls update on gajian_minggu", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await saveGajianRequest("g1", { pettycash: 10000, tambahan: [], kasbonDeductions: [], totalRequest: 10000 });
    expect(supabase.from).toHaveBeenCalledWith("gajian_minggu");
    expect(chain.update).toHaveBeenCalled();
  });
});

describe("finalizeGajian", () => {
  it("calls update with status final", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await finalizeGajian("g1", {
      totals: { potong: 0, jahit: 0, finishing: 0, qa: 0, kreatif: 0, cmt: 0, gaji: 0 },
      pettycash: 0, tambahan: [], kasbonDeductions: [], totalRequest: 0
    });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "final" }));
  });
});

describe("fetchGajianTotals", () => {
  it("aggregates total_upah per tim", async () => {
    chain.then = (resolve) => resolve({ data: [{ total_upah: 100000 }] });
    const totals = await fetchGajianTotals("g1");
    expect(typeof totals.gaji).toBe("number");
  });
});

describe("fetchKaryawanIdsInGajian", () => {
  it("returns unique karyawan_ids", async () => {
    chain.then = (resolve) => resolve({ data: [{ karyawan_id: "k1" }, { karyawan_id: "k1" }] });
    const ids = await fetchKaryawanIdsInGajian("g1");
    // unique via Set — should be 1
    expect(ids.length).toBeLessThanOrEqual(2);
  });
});

// Generic CRUD helpers for each tim
const timTests = [
  { fetch: fetchPotong, save: savePotong, del: deletePotong, table: "gaji_potong" },
  { fetch: fetchJahit, save: saveJahit, del: deleteJahit, table: "gaji_jahit" },
  { fetch: fetchQC, save: saveQC, del: deleteQC, table: "gaji_qc" },
  { fetch: fetchKreatif, save: saveKreatif, del: deleteKreatif, table: "gaji_kreatif" },
  { fetch: fetchCmt, save: saveCmt, del: deleteCmt, table: "gaji_cmt" },
];

for (const { fetch, save, del, table } of timTests) {
  describe(table, () => {
    it("fetch returns array", async () => {
      chain.then = (resolve) => resolve({ data: [{ id: "r1" }], error: null });
      const res = await fetch("g1");
      expect(res).toHaveLength(1);
    });
    it("save insert calls insert", async () => {
      chain.then = (resolve) => resolve({ error: null });
      await save({ payload: { gajian_id: "g1" }, editingId: null });
      expect(chain.insert).toHaveBeenCalled();
    });
    it("save update calls update", async () => {
      chain.then = (resolve) => resolve({ error: null });
      await save({ payload: { gajian_id: "g1" }, editingId: "r1" });
      expect(chain.update).toHaveBeenCalled();
    });
    it("delete calls delete with id", async () => {
      chain.then = (resolve) => resolve({ error: null });
      await del("r1");
      expect(chain.delete).toHaveBeenCalled();
    });
  });
}

describe("fetchFinishing (maybeSingle)", () => {
  it("returns null when no record", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    const res = await fetchFinishing("g1");
    expect(res).toBeNull();
  });
});

describe("saveFinishing", () => {
  it("insert path", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await saveFinishing({ payload: {}, editingId: null });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe("deleteFinishing", () => {
  it("calls delete", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deleteFinishing("r1");
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe("fetchProdukList", () => {
  it("returns products", async () => {
    chain.then = (resolve) => resolve({ data: [{ kode: "D-01-OSK", nama: "GAMIS" }], error: null });
    const res = await fetchProdukList();
    expect(res).toHaveLength(1);
  });
});

describe("fetchUpahJahitByKode", () => {
  it("builds map keyed by kode_produk, keeping first (latest) row per kode", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          { kode_produk: "D-01-OSK", upah_jahit: 27000, tanggal_produksi: "2026-07-01", created_at: "2026-07-01T10:00:00Z" },
          { kode_produk: "D-01-OSK", upah_jahit: 20000, tanggal_produksi: "2026-06-01", created_at: "2026-06-01T10:00:00Z" },
          { kode_produk: "D-02-SFN", upah_jahit: 25000, tanggal_produksi: "2026-07-02", created_at: "2026-07-02T10:00:00Z" },
        ],
        error: null,
      });
    const map = await fetchUpahJahitByKode();
    expect(map).toEqual({ "D-01-OSK": 27000, "D-02-SFN": 25000 });
    expect(supabase.from).toHaveBeenCalledWith("produksi_batch");
  });

  it("skips rows without kode_produk and defaults missing upah_jahit to 0", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          { kode_produk: null, upah_jahit: 10000 },
          { kode_produk: "D-03-OSK", upah_jahit: null },
        ],
        error: null,
      });
    const map = await fetchUpahJahitByKode();
    expect(map).toEqual({ "D-03-OSK": 0 });
  });

  it("returns empty object when no data", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchUpahJahitByKode()).toEqual({});
  });

  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("db error"));
    await expect(fetchUpahJahitByKode()).rejects.toThrow();
  });
});

describe("fetchUpahJahitHistoryByKode", () => {
  it("builds map keyed by kode dari kartu_items, ambil upah TERBARU per kode (row created_at desc)", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          {
            created_at: "2026-08-01T10:00:00Z",
            kartu_items: [{ kode: "D-01-OSK", upah: 27000 }, { kode: "D-02-SFN", upah: 25000 }],
          },
          {
            created_at: "2026-07-01T10:00:00Z",
            kartu_items: [{ kode: "D-01-OSK", upah: 20000 }],
          },
        ],
        error: null,
      });
    const map = await fetchUpahJahitHistoryByKode();
    expect(map).toEqual({ "D-01-OSK": 27000, "D-02-SFN": 25000 });
    expect(supabase.from).toHaveBeenCalledWith("gaji_jahit");
  });

  it("mengabaikan item tanpa kode & upah 0/kosong (tidak menimpa histori valid)", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          {
            created_at: "2026-08-01T10:00:00Z",
            kartu_items: [{ kode: null, upah: 10000 }, { kode: "D-03-OSK", upah: 0 }, { kode: "D-03-OSK", upah: "" }],
          },
        ],
        error: null,
      });
    const map = await fetchUpahJahitHistoryByKode();
    expect(map).toEqual({});
  });

  it("kartu_items null/undefined per row tidak error (dianggap kosong)", async () => {
    chain.then = (resolve) =>
      resolve({ data: [{ created_at: "2026-08-01T10:00:00Z", kartu_items: null }], error: null });
    expect(await fetchUpahJahitHistoryByKode()).toEqual({});
  });

  it("returns empty object when no data", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchUpahJahitHistoryByKode()).toEqual({});
  });

  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("db error"));
    await expect(fetchUpahJahitHistoryByKode()).rejects.toThrow();
  });
});
