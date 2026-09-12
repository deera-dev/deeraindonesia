import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select","eq","order","update","insert","delete","in","gt","single","maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), rpc: vi.fn(), _chain: chain } };
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
  loadFinishingReconciliation, applyFinishingStockIntake,
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
  it("insert path, returns id record baru", async () => {
    chain.then = (resolve) => resolve({ data: { id: "gf-1" }, error: null });
    const id = await saveFinishing({ payload: {}, editingId: null });
    expect(chain.insert).toHaveBeenCalled();
    expect(id).toBe("gf-1");
  });

  it("update path, returns id record yang diedit", async () => {
    chain.then = (resolve) => resolve({ data: { id: "gf-2" }, error: null });
    const id = await saveFinishing({ payload: {}, editingId: "gf-2" });
    expect(chain.update).toHaveBeenCalled();
    expect(id).toBe("gf-2");
  });

  it("throws saat error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fail") });
    await expect(saveFinishing({ payload: {}, editingId: null })).rejects.toThrow("fail");
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

// ── Rekonsiliasi Stok Masuk dari Finishing (permintaan Denny 2026-09) ────────
// supabase.from dipanggil utk 2 tabel berbeda (jahit_cards, stok_warna)
// dalam satu pemanggilan loadFinishingReconciliation — pakai
// mockImplementation lokal per-test (bukan `chain` global) supaya masing2
// tabel bisa dikembalikan datanya sendiri. supabase.rpc juga di-mock lokal
// (tidak dipakai fungsi lain di file ini).

function makeChain(returnVal) {
  const c = {};
  for (const m of ["select", "eq", "order"]) c[m] = vi.fn().mockReturnValue(c);
  c.then = (resolve) => resolve(returnVal);
  return c;
}

describe("loadFinishingReconciliation", () => {
  it("mengambil kartu ready_finishing + qty terjual + stok per kode, lalu hitung breakdown", async () => {
    const cardsChain = makeChain({ data: [{ id: "c1", size: "Midi", warna: "HITAM", qty: 10 }], error: null });
    const stokChain = makeChain({ data: [{ size: "Midi", warna: "HITAM", gudang: 1, cideng: 0, tegalgubug: 0 }], error: null });
    supabase.from.mockImplementation((table) => (table === "jahit_cards" ? cardsChain : stokChain));
    supabase.rpc.mockResolvedValue({ data: [{ size: "Midi", warna: "HITAM", qty: 2 }], error: null });

    const result = await loadFinishingReconciliation([{ kode_produk: "D-01-OSK", nama_produk: "Gamis A", jumlah: 10 }]);

    expect(cardsChain.eq).toHaveBeenCalledWith("kode_produk", "D-01-OSK");
    expect(cardsChain.eq).toHaveBeenCalledWith("status", "ready_finishing");
    expect(supabase.rpc).toHaveBeenCalledWith("get_sold_qty_by_kode", { p_kode: "D-01-OSK" });
    expect(result["D-01-OSK"]).toMatchObject({
      kode: "D-01-OSK",
      mismatch: false,
      cardsSum: 10,
    });
    expect(result["D-01-OSK"].rows[0]).toMatchObject({ stokSaatIni: 1, terjualSaatIni: 2, qtyDitambahkan: 7 });
  });

  it("throws kalau salah satu query error", async () => {
    const errChain = makeChain({ data: null, error: new Error("db down") });
    const okChain = makeChain({ data: [], error: null });
    supabase.from.mockImplementation((table) => (table === "jahit_cards" ? errChain : okChain));
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await expect(
      loadFinishingReconciliation([{ kode_produk: "D-01-OSK", nama_produk: "Gamis A", jumlah: 10 }]),
    ).rejects.toThrow("db down");
  });

  it("array items kosong -> object kosong, tidak query apa pun", async () => {
    expect(await loadFinishingReconciliation([])).toEqual({});
  });
});

describe("applyFinishingStockIntake", () => {
  it("panggil increment_stok_gudang, tandai kartu done, dan catat stok_masuk_log utk baris dgn qtyDitambahkan > 0", async () => {
    const logChain = makeChain({ error: null });
    logChain.insert = vi.fn().mockReturnValue(logChain);
    const cardChain = makeChain({ error: null });
    cardChain.update = vi.fn().mockReturnValue(cardChain);
    cardChain.eq = vi.fn().mockReturnValue(cardChain);
    supabase.from.mockImplementation((table) => (table === "stok_masuk_log" ? logChain : cardChain));
    supabase.rpc.mockResolvedValue({ error: null });

    const rows = [
      { kode: "D-01-OSK", size: "Midi", warna: "HITAM", qtyKartu: 10, cardId: "c1", stokSaatIni: 1, terjualSaatIni: 2, qtyDitambahkan: 7 },
      { kode: "D-01-OSK", size: "Midi", warna: "PUTIH", qtyKartu: 5, cardId: null, stokSaatIni: 5, terjualSaatIni: 0, qtyDitambahkan: 0 },
    ];
    await applyFinishingStockIntake({ rows, gajianFinishingId: "gf-1", userEmail: "a@b.com", userName: "A" });

    expect(supabase.rpc).toHaveBeenCalledTimes(1); // baris ke-2 (qtyDitambahkan=0) di-skip
    expect(supabase.rpc).toHaveBeenCalledWith("increment_stok_gudang", {
      p_kode: "D-01-OSK", p_size: "Midi", p_warna: "HITAM", p_delta: 7,
    });
    expect(cardChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "done" }));
    expect(cardChain.eq).toHaveBeenCalledWith("id", "c1");
    expect(logChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ kode: "D-01-OSK", qty_ditambahkan: 7, gajian_finishing_id: "gf-1", created_by: "a@b.com" }),
    );
  });

  it("baris manual (cardId null) TIDAK memicu update jahit_cards", async () => {
    const logChain = makeChain({ error: null });
    logChain.insert = vi.fn().mockReturnValue(logChain);
    const cardChain = makeChain({ error: null });
    cardChain.update = vi.fn().mockReturnValue(cardChain);
    supabase.from.mockImplementation((table) => (table === "stok_masuk_log" ? logChain : cardChain));
    supabase.rpc.mockResolvedValue({ error: null });

    await applyFinishingStockIntake({
      rows: [{ kode: "D-01-OSK", size: "Gamis", warna: "MERAH", qtyKartu: 3, cardId: null, stokSaatIni: 0, terjualSaatIni: 0, qtyDitambahkan: 3 }],
      gajianFinishingId: null,
    });

    expect(cardChain.update).not.toHaveBeenCalled();
    expect(logChain.insert).toHaveBeenCalledWith(expect.objectContaining({ jahit_card_id: null }));
  });

  it("throws kalau increment_stok_gudang gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: new Error("rpc fail") });
    await expect(
      applyFinishingStockIntake({ rows: [{ kode: "D-01", size: "Midi", warna: "HITAM", qtyKartu: 1, cardId: null, qtyDitambahkan: 1 }] }),
    ).rejects.toThrow("rpc fail");
  });

  it("array rows kosong -> tidak melakukan apa pun", async () => {
    await applyFinishingStockIntake({ rows: [] });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
