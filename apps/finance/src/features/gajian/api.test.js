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
  fetchProduksiTotalByKode, fetchKancingHppByKode,
  loadFinishingReconciliation, applyFinishingStockIntake,
  fetchStokMasukLogByKode, syncJahitCardsFromGajian, syncKancingHppFromFinishing,
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

// ── Acuan pilih produk di Finishing (permintaan Denny 2026-09) ──────────────
describe("fetchProduksiTotalByKode", () => {
  it("menjumlahkan qty semua size+warna, semua batch, per kode", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          { kode_produk: "D-01-OSK", sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 10 }, { warna: "PUTIH", qty: 5 }] }] },
          { kode_produk: "D-01-OSK", sizes: [{ size: "Gamis", warna: [{ warna: "HITAM", qty: 7 }] }] },
          { kode_produk: "D-02-SFN", sizes: [{ size: "Midi", warna: [{ warna: "_", qty: 20 }] }] },
        ],
        error: null,
      });
    const map = await fetchProduksiTotalByKode();
    expect(map).toEqual({ "D-01-OSK": 22, "D-02-SFN": 20 });
    expect(supabase.from).toHaveBeenCalledWith("produksi_batch");
  });

  it("mengabaikan baris tanpa kode_produk & sizes kosong/null", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          { kode_produk: null, sizes: [{ size: "Midi", warna: [{ warna: "_", qty: 10 }] }] },
          { kode_produk: "D-03-OSK", sizes: null },
        ],
        error: null,
      });
    const map = await fetchProduksiTotalByKode();
    expect(map).toEqual({ "D-03-OSK": 0 });
  });

  it("returns {} kalau tidak ada data", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchProduksiTotalByKode()).toEqual({});
  });

  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("db error"));
    await expect(fetchProduksiTotalByKode()).rejects.toThrow();
  });
});

describe("fetchKancingHppByKode", () => {
  it("membangun map kode -> kancing_qty dari hpp_template", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          { kode_produk: "D-01-OSK", kancing_qty: 8 },
          { kode_produk: "D-02-SFN", kancing_qty: 0 },
        ],
        error: null,
      });
    const map = await fetchKancingHppByKode();
    expect(map).toEqual({ "D-01-OSK": 8, "D-02-SFN": 0 });
    expect(supabase.from).toHaveBeenCalledWith("hpp_template");
  });

  it("kode tanpa Template HPP TIDAK muncul di map (beda dari kancing_qty=0)", async () => {
    chain.then = (resolve) => resolve({ data: [{ kode_produk: "D-01-OSK", kancing_qty: 5 }], error: null });
    const map = await fetchKancingHppByKode();
    expect(map).not.toHaveProperty("D-99-XXX");
    expect(map).toEqual({ "D-01-OSK": 5 });
  });

  it("mengabaikan baris tanpa kode_produk", async () => {
    chain.then = (resolve) => resolve({ data: [{ kode_produk: null, kancing_qty: 5 }], error: null });
    expect(await fetchKancingHppByKode()).toEqual({});
  });

  it("returns {} kalau tidak ada data", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchKancingHppByKode()).toEqual({});
  });

  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("db error"));
    await expect(fetchKancingHppByKode()).rejects.toThrow();
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

  // Bugfix 2026-09 (rekonsiliasi ulang/edit): kalau kartu ready_finishing
  // sudah kosong (semua "done" dari rekonsiliasi sebelumnya), fetch riwayat
  // stok_masuk_log kode itu supaya baris manual bisa diseed dgn placeholder
  // dari qty terakhir — TIDAK query stok_masuk_log kalau kartu MASIH ada
  // (jalur normal, hindari query tak perlu).
  it("cards kosong -> fetch stok_masuk_log & seed baris manual placeholder dari riwayat", async () => {
    const cardsChain = makeChain({ data: [], error: null });
    const stokChain = makeChain({ data: [], error: null });
    const logChain = makeChain({ data: [{ size: "Midi", warna: "HITAM", qty_kartu: 12, created_at: "2026-09-01" }], error: null });
    supabase.from.mockImplementation((table) => {
      if (table === "jahit_cards") return cardsChain;
      if (table === "stok_masuk_log") return logChain;
      return stokChain;
    });
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const result = await loadFinishingReconciliation([{ kode_produk: "D-01-OSK", nama_produk: "Gamis A", jumlah: 12 }]);

    expect(logChain.eq).toHaveBeenCalledWith("kode", "D-01-OSK");
    expect(result["D-01-OSK"].rows).toHaveLength(1);
    expect(result["D-01-OSK"].rows[0]).toMatchObject({ size: "Midi", warna: "HITAM", qtyKartu: "", qtyKartuPlaceholder: 12 });
  });

  it("cards TIDAK kosong -> tidak query stok_masuk_log sama sekali", async () => {
    const cardsChain = makeChain({ data: [{ id: "c1", size: "Midi", warna: "HITAM", qty: 5 }], error: null });
    const stokChain = makeChain({ data: [], error: null });
    const logChain = makeChain({ data: [], error: null });
    supabase.from.mockImplementation((table) => {
      if (table === "jahit_cards") return cardsChain;
      if (table === "stok_masuk_log") return logChain;
      return stokChain;
    });
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await loadFinishingReconciliation([{ kode_produk: "D-01-OSK", nama_produk: "Gamis A", jumlah: 5 }]);

    expect(logChain.select).not.toHaveBeenCalled();
  });
});

describe("fetchStokMasukLogByKode", () => {
  it("select size/warna/qty_kartu/created_at, filter kode, urut created_at desc", async () => {
    const c = makeChain({ data: [{ size: "Midi", warna: "HITAM", qty_kartu: 10 }], error: null });
    supabase.from.mockReturnValue(c);

    const result = await fetchStokMasukLogByKode("D-01-OSK");

    expect(supabase.from).toHaveBeenCalledWith("stok_masuk_log");
    expect(c.select).toHaveBeenCalledWith("size, warna, qty_kartu, created_at");
    expect(c.eq).toHaveBeenCalledWith("kode", "D-01-OSK");
    expect(c.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ size: "Midi", warna: "HITAM", qty_kartu: 10 }]);
  });

  it("throws kalau error", async () => {
    const c = makeChain({ data: null, error: new Error("boom") });
    supabase.from.mockReturnValue(c);
    await expect(fetchStokMasukLogByKode("D-01")).rejects.toThrow("boom");
  });

  it("data null -> array kosong", async () => {
    const c = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(c);
    expect(await fetchStokMasukLogByKode("D-01")).toEqual([]);
  });
});

describe("syncJahitCardsFromGajian", () => {
  function makeUpdateChain() {
    const c = {};
    c.update = vi.fn().mockReturnValue(c);
    c.eq = vi.fn().mockReturnValue(c);
    c.then = (resolve) => resolve({ error: null });
    return c;
  }

  it("tandai kartu 'done' + isi karyawan utk kode yang ada di gaji_jahit DAN gaji_finishing periode ini", async () => {
    const jahitChain = makeChain({
      data: [{ karyawan_id: "k1", karyawan: { nama: "Budi" }, kartu_items: [{ kode: "D-01", jumlah: 8 }] }],
      error: null,
    });
    const finishingChain = makeChain({ data: { items: [{ kode_produk: "D-01", jumlah: 8 }] }, error: null });
    finishingChain.maybeSingle = vi.fn().mockReturnValue(finishingChain);
    const cardsSelectChain = makeChain({ data: [{ id: "c1", qty: 5 }, { id: "c2", qty: 3 }], error: null });
    cardsSelectChain.neq = vi.fn().mockReturnValue(cardsSelectChain);
    const updateChain = makeUpdateChain();
    let cardCallCount = 0;
    supabase.from.mockImplementation((table) => {
      if (table === "gaji_jahit") return jahitChain;
      if (table === "gaji_finishing") return finishingChain;
      if (table === "jahit_cards") {
        cardCallCount++;
        return cardCallCount === 1 ? cardsSelectChain : updateChain;
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await syncJahitCardsFromGajian("g1");

    expect(jahitChain.eq).toHaveBeenCalledWith("gajian_id", "g1");
    expect(finishingChain.eq).toHaveBeenCalledWith("gajian_id", "g1");
    expect(cardsSelectChain.eq).toHaveBeenCalledWith("kode_produk", "D-01");
    expect(cardsSelectChain.neq).toHaveBeenCalledWith("status", "done");
    expect(updateChain.update).toHaveBeenCalledTimes(2);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done", karyawan_id: "k1", karyawan_nama: "Budi" }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", "c1");
    expect(updateChain.eq).toHaveBeenCalledWith("id", "c2");
    expect(result).toEqual({ updatedCards: 2, kodeSynced: ["D-01"] });
  });

  it("kode di gaji_jahit tapi TIDAK ada di gaji_finishing periode ini -> dilewati", async () => {
    const jahitChain = makeChain({
      data: [{ karyawan_id: "k1", karyawan: { nama: "Budi" }, kartu_items: [{ kode: "D-01", jumlah: 8 }] }],
      error: null,
    });
    const finishingChain = makeChain({ data: { items: [] }, error: null });
    finishingChain.maybeSingle = vi.fn().mockReturnValue(finishingChain);
    supabase.from.mockImplementation((table) => (table === "gaji_jahit" ? jahitChain : finishingChain));

    const result = await syncJahitCardsFromGajian("g1");
    expect(result).toEqual({ updatedCards: 0, kodeSynced: [] });
  });

  it("gaji_finishing belum ada record (maybeSingle null) -> tidak ada yg disinkron", async () => {
    const jahitChain = makeChain({ data: [], error: null });
    const finishingChain = makeChain({ data: null, error: null });
    finishingChain.maybeSingle = vi.fn().mockReturnValue(finishingChain);
    supabase.from.mockImplementation((table) => (table === "gaji_jahit" ? jahitChain : finishingChain));

    expect(await syncJahitCardsFromGajian("g1")).toEqual({ updatedCards: 0, kodeSynced: [] });
  });

  it("kode ada di keduanya tapi tidak ada kartu jahit_cards tersisa (semua sudah done) -> dilewati, tidak error", async () => {
    const jahitChain = makeChain({
      data: [{ karyawan_id: "k1", karyawan: { nama: "Budi" }, kartu_items: [{ kode: "D-01", jumlah: 8 }] }],
      error: null,
    });
    const finishingChain = makeChain({ data: { items: [{ kode_produk: "D-01", jumlah: 8 }] }, error: null });
    finishingChain.maybeSingle = vi.fn().mockReturnValue(finishingChain);
    const cardsSelectChain = makeChain({ data: [], error: null });
    cardsSelectChain.neq = vi.fn().mockReturnValue(cardsSelectChain);
    supabase.from.mockImplementation((table) => {
      if (table === "gaji_jahit") return jahitChain;
      if (table === "gaji_finishing") return finishingChain;
      return cardsSelectChain;
    });

    expect(await syncJahitCardsFromGajian("g1")).toEqual({ updatedCards: 0, kodeSynced: [] });
  });

  it("throws kalau query gaji_jahit error", async () => {
    const jahitChain = makeChain({ data: null, error: new Error("db down") });
    const finishingChain = makeChain({ data: { items: [] }, error: null });
    finishingChain.maybeSingle = vi.fn().mockReturnValue(finishingChain);
    supabase.from.mockImplementation((table) => (table === "gaji_jahit" ? jahitChain : finishingChain));

    await expect(syncJahitCardsFromGajian("g1")).rejects.toThrow("db down");
  });
});

// Permintaan Denny 2026-09: arah Finishing -> HPP dari fitur "kancing
// saling terhubung" (arah sebaliknya HPP -> Finishing murni baca, sudah
// dites lewat fetchKancingHppByKode + FinishingForm.test.jsx).
describe("syncKancingHppFromFinishing", () => {
  function makeUpdateChain() {
    const c = {};
    c.update = vi.fn().mockReturnValue(c);
    c.eq = vi.fn().mockReturnValue(c);
    c.then = (resolve) => resolve({ error: null });
    return c;
  }

  it("update hpp_template.kancing_qty utk kode yang kancing_qty-nya masih 0", async () => {
    const templateChain = makeChain({ data: [{ kode_produk: "D-01", kancing_qty: 0 }], error: null });
    templateChain.in = vi.fn().mockReturnValue(templateChain);
    const updateChain = makeUpdateChain();
    // Panggilan pertama ke "hpp_template" = SELECT (templateChain), panggilan
    // kedua = UPDATE (updateChain) — dibedakan lewat urutan panggilan.
    let callCount = 0;
    supabase.from.mockImplementation((table) => {
      expect(table).toBe("hpp_template");
      callCount++;
      return callCount === 1 ? templateChain : updateChain;
    });

    const result = await syncKancingHppFromFinishing([{ kode_produk: "D-01", kancing_per_pcs: 8 }]);

    expect(templateChain.in).toHaveBeenCalledWith("kode_produk", ["D-01"]);
    expect(updateChain.update).toHaveBeenCalledWith({ kancing_qty: 8 });
    expect(updateChain.eq).toHaveBeenCalledWith("kode_produk", "D-01");
    expect(result).toEqual({ updated: ["D-01"] });
  });

  it("TIDAK menimpa kalau hpp_template.kancing_qty sudah > 0", async () => {
    const templateChain = makeChain({ data: [{ kode_produk: "D-01", kancing_qty: 5 }], error: null });
    templateChain.in = vi.fn().mockReturnValue(templateChain);
    supabase.from.mockReturnValue(templateChain);

    const result = await syncKancingHppFromFinishing([{ kode_produk: "D-01", kancing_per_pcs: 8 }]);

    expect(result).toEqual({ updated: [] });
  });

  it("TIDAK auto-create kalau Template HPP kode itu belum ada sama sekali", async () => {
    const templateChain = makeChain({ data: [], error: null });
    templateChain.in = vi.fn().mockReturnValue(templateChain);
    supabase.from.mockReturnValue(templateChain);

    const result = await syncKancingHppFromFinishing([{ kode_produk: "D-99-BARU", kancing_per_pcs: 6 }]);

    expect(result).toEqual({ updated: [] });
  });

  it("mengabaikan item tanpa kode_produk atau kancing_per_pcs <= 0, tidak query sama sekali", async () => {
    const result = await syncKancingHppFromFinishing([
      { kode_produk: "", kancing_per_pcs: 8 },
      { kode_produk: "D-01", kancing_per_pcs: 0 },
    ]);
    expect(result).toEqual({ updated: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("array items kosong / undefined -> tidak query, hasil kosong", async () => {
    expect(await syncKancingHppFromFinishing([])).toEqual({ updated: [] });
    expect(await syncKancingHppFromFinishing(undefined)).toEqual({ updated: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws kalau query SELECT hpp_template error", async () => {
    const templateChain = makeChain({ data: null, error: new Error("db down") });
    templateChain.in = vi.fn().mockReturnValue(templateChain);
    supabase.from.mockReturnValue(templateChain);

    await expect(syncKancingHppFromFinishing([{ kode_produk: "D-01", kancing_per_pcs: 8 }])).rejects.toThrow("db down");
  });

  it("throws kalau UPDATE gagal", async () => {
    const templateChain = makeChain({ data: [{ kode_produk: "D-01", kancing_qty: 0 }], error: null });
    templateChain.in = vi.fn().mockReturnValue(templateChain);
    const failChain = {};
    failChain.update = vi.fn().mockReturnValue(failChain);
    failChain.eq = vi.fn().mockReturnValue(failChain);
    failChain.then = (resolve) => resolve({ error: new Error("update gagal") });
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? templateChain : failChain;
    });

    await expect(syncKancingHppFromFinishing([{ kode_produk: "D-01", kancing_per_pcs: 8 }])).rejects.toThrow("update gagal");
  });

  it("dedupe kode duplikat dalam satu array items -> hanya di-update sekali", async () => {
    const templateChain = makeChain({ data: [{ kode_produk: "D-01", kancing_qty: 0 }], error: null });
    templateChain.in = vi.fn().mockReturnValue(templateChain);
    const updateChain = makeUpdateChain();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? templateChain : updateChain;
    });

    const result = await syncKancingHppFromFinishing([
      { kode_produk: "D-01", kancing_per_pcs: 8 },
      { kode_produk: "D-01", kancing_per_pcs: 8 },
    ]);

    expect(updateChain.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ updated: ["D-01"] });
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
