import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import {
  fetchJahitCards,
  fetchDoneJahitCards,
  fetchKaryawanJahit,
  createJahitCardsForBatch,
  renameJahitCardsForBatch,
  assignKaryawan,
  moveToReadyFinishing,
  unassignCard,
  moveBackToProgress,
  markCardDone,
} from "./api";

// select().neq().order() terminal — dipakai fetchJahitCards
function makeOrderChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(returnVal),
    eq: vi.fn().mockReturnThis(),
  };
}
// Chain "thenable" — semua method (select/eq/order/limit/gte/lte/ilike)
// mengembalikan chain yang SAMA (persis Supabase query builder asli), dan
// `await` di api.js memicu `.then()` di sini. Dipakai fetchDoneJahitCards
// karena method TERAKHIR sebelum `await` beda-beda tergantung filter mana
// yang aktif (limit saja / +gte / +lte / +ilike) — thenable pattern ini
// menghindari harus menebak "method mana yang terminal" per kombinasi filter.
function makeDoneChain(returnVal = { data: [], error: null }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    ilike: vi.fn(),
    then: (resolve) => resolve(returnVal),
  };
  for (const key of ["select", "eq", "order", "limit", "gte", "lte", "ilike"]) {
    chain[key].mockReturnValue(chain);
  }
  return chain;
}
// select().eq().eq().order() terminal — dipakai fetchKaryawanJahit
function makeDoubleEqOrderChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(returnVal),
  };
}
// select().eq() terminal — dipakai createJahitCardsForBatch (cek existing)
function makeSelectEqChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(returnVal),
  };
}
// insert().select() terminal
function makeInsertSelectChain(returnVal = { data: [], error: null }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue(returnVal),
  };
}
// update().eq() terminal
function makeUpdateEqChain(returnVal = { error: null }) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(returnVal),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("fetchJahitCards", () => {
  it("returns kartu list, exclude status done", async () => {
    const chain = makeOrderChain({ data: [{ id: "c1" }], error: null });
    supabase.from.mockReturnValue(chain);
    expect(await fetchJahitCards()).toEqual([{ id: "c1" }]);
    expect(chain.neq).toHaveBeenCalledWith("status", "done");
  });

  it("returns [] when data null", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: null }));
    expect(await fetchJahitCards()).toEqual([]);
  });

  it("throws when error", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: new Error("boom") }));
    await expect(fetchJahitCards()).rejects.toThrow("boom");
  });
});

describe("fetchDoneJahitCards", () => {
  it("filter status=done, urut done_at desc, limit 200 (tanpa filter tambahan)", async () => {
    const chain = makeDoneChain({ data: [{ id: "c1", status: "done" }], error: null });
    supabase.from.mockReturnValue(chain);
    const result = await fetchDoneJahitCards();
    expect(result).toEqual([{ id: "c1", status: "done" }]);
    expect(chain.eq).toHaveBeenCalledWith("status", "done");
    expect(chain.order).toHaveBeenCalledWith("done_at", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(200);
    expect(chain.gte).not.toHaveBeenCalled();
    expect(chain.ilike).not.toHaveBeenCalled();
  });

  it("menerapkan filter dateFrom/dateTo/search kalau diberikan", async () => {
    const chain = makeDoneChain({ data: [], error: null });
    supabase.from.mockReturnValue(chain);
    await fetchDoneJahitCards({ dateFrom: "2026-09-01", dateTo: "2026-09-30", search: "D-01" });
    expect(chain.gte).toHaveBeenCalledWith("done_at", "2026-09-01T00:00:00");
    expect(chain.lte).toHaveBeenCalledWith("done_at", "2026-09-30T23:59:59");
    expect(chain.ilike).toHaveBeenCalledWith("kode_produk", "%D-01%");
  });

  it("returns [] when data null", async () => {
    supabase.from.mockReturnValue(makeDoneChain({ data: null, error: null }));
    expect(await fetchDoneJahitCards()).toEqual([]);
  });

  it("throws when error", async () => {
    supabase.from.mockReturnValue(makeDoneChain({ data: null, error: new Error("boom") }));
    await expect(fetchDoneJahitCards()).rejects.toThrow("boom");
  });
});

describe("fetchKaryawanJahit", () => {
  it("filter tim=jahit dan aktif=true", async () => {
    const chain = makeDoubleEqOrderChain({ data: [{ id: "k1", nama: "Budi" }], error: null });
    supabase.from.mockReturnValue(chain);
    const result = await fetchKaryawanJahit();
    expect(result).toEqual([{ id: "k1", nama: "Budi" }]);
    expect(chain.eq).toHaveBeenCalledWith("tim", "jahit");
    expect(chain.eq).toHaveBeenCalledWith("aktif", true);
  });
});

describe("createJahitCardsForBatch", () => {
  const sizes = [
    { size: "Midi", warna: [{ warna: "HITAM", qty: 5 }, { warna: "PUTIH", qty: 3 }] },
  ];

  it("hanya insert kombinasi size x warna yang belum ada kartunya", async () => {
    const existingChain = makeSelectEqChain({ data: [{ size: "Midi", warna: "HITAM" }], error: null });
    const insertChain = makeInsertSelectChain({ data: [{ id: "new1" }], error: null });
    supabase.from.mockReturnValueOnce(existingChain).mockReturnValueOnce(insertChain);

    const result = await createJahitCardsForBatch({ batchId: "b1", kode: "D-01-OSK", nama: "Gamis A", sizes });

    expect(insertChain.insert).toHaveBeenCalledWith([
      { batch_id: "b1", kode_produk: "D-01-OSK", nama_produk: "Gamis A", size: "Midi", warna: "PUTIH", qty: 3 },
    ]);
    expect(result).toEqual([{ id: "new1" }]);
  });

  it("tidak insert apa pun kalau semua kombinasi sudah ada kartunya", async () => {
    const existingChain = makeSelectEqChain({
      data: [
        { size: "Midi", warna: "HITAM" },
        { size: "Midi", warna: "PUTIH" },
      ],
      error: null,
    });
    supabase.from.mockReturnValueOnce(existingChain);

    const result = await createJahitCardsForBatch({ batchId: "b1", kode: "D-01-OSK", nama: "Gamis A", sizes });
    expect(result).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(1); // tidak pernah panggil insert
  });

  it("tidak melakukan apa pun kalau batchId atau sizes kosong", async () => {
    expect(await createJahitCardsForBatch({ batchId: null, sizes })).toEqual([]);
    expect(await createJahitCardsForBatch({ batchId: "b1", sizes: [] })).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("renameJahitCardsForBatch (permintaan Denny 2026-09 — cascade rename)", () => {
  it("update kode_produk/nama_produk semua kartu utk batch_id itu (termasuk yang 'done')", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);
    await renameJahitCardsForBatch({ batchId: "b1", kode: "D-02-OSK", nama: "Gamis Baru" });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ kode_produk: "D-02-OSK", nama_produk: "Gamis Baru" }),
    );
    expect(chain.eq).toHaveBeenCalledWith("batch_id", "b1");
  });

  it("tidak melakukan apa pun kalau batchId kosong", async () => {
    await renameJahitCardsForBatch({ batchId: null, kode: "D-02-OSK", nama: "X" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws saat error", async () => {
    supabase.from.mockReturnValue(makeUpdateEqChain({ error: new Error("fail") }));
    await expect(
      renameJahitCardsForBatch({ batchId: "b1", kode: "D-02-OSK", nama: "X" }),
    ).rejects.toThrow("fail");
  });
});

describe("assignKaryawan", () => {
  it("update status jadi on_progress dan catat history", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);
    await assignKaryawan({ cardId: "c1", karyawanId: "k1", karyawanNama: "Budi", kode: "D-01-OSK", nama: "Gamis A" });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ karyawan_id: "k1", karyawan_nama: "Budi", status: "on_progress" }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "jahit-assign" }));
  });

  it("throws saat error", async () => {
    supabase.from.mockReturnValue(makeUpdateEqChain({ error: new Error("fail") }));
    await expect(
      assignKaryawan({ cardId: "c1", karyawanId: "k1", karyawanNama: "Budi", kode: "D-01-OSK", nama: "Gamis A" }),
    ).rejects.toThrow("fail");
  });
});

describe("moveToReadyFinishing", () => {
  it("update status jadi ready_finishing", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);
    await moveToReadyFinishing({ cardId: "c1", kode: "D-01-OSK", nama: "Gamis A" });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "ready_finishing" }));
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "jahit-selesai" }));
  });
});

describe("unassignCard", () => {
  it("reset kartu ke belum_assign", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);
    await unassignCard({ cardId: "c1", kode: "D-01-OSK", nama: "Gamis A" });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "belum_assign", karyawan_id: null, karyawan_nama: null }),
    );
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "jahit-batal-assign" }));
  });
});

describe("moveBackToProgress", () => {
  it("kembalikan status ke on_progress", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);
    await moveBackToProgress({ cardId: "c1", kode: "D-01-OSK", nama: "Gamis A" });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "on_progress" }));
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "jahit-kembali-progress" }));
  });
});

describe("markCardDone", () => {
  it("update status jadi done + set done_at, catat history", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);
    await markCardDone({ cardId: "c1", kode: "D-01-OSK", nama: "Gamis A" });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done", done_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "jahit-tandai-selesai" }));
  });

  it("throws saat error", async () => {
    supabase.from.mockReturnValue(makeUpdateEqChain({ error: new Error("fail") }));
    await expect(markCardDone({ cardId: "c1", kode: "D-01-OSK", nama: "Gamis A" })).rejects.toThrow("fail");
  });
});
