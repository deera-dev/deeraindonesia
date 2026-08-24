import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import {
  fetchSampels,
  updateSampel,
  createSampels,
  createPlanning,
  reorderPlanning,
  markSampelDibuat,
  saveBatchDecisions,
  deleteSampel,
} from "./api";

function makeOrderChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(returnVal),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
}
function makeEqChain(returnVal = { data: null, error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(returnVal),
  };
}
// For insert().select() — terminal is select
function makeInsertSelectChain(returnVal = { data: [], error: null }) {
  const c = {
    select: vi.fn().mockResolvedValue(returnVal),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  // insert returns same chain so select can be called on it
  return c;
}
// For insert().select().single() — dipakai createPlanning (single-entry insert)
function makeInsertSelectSingleChain(returnVal = { data: null, error: null }) {
  const c = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnVal),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  return c;
}
// For update().eq().throwOnError() — dipakai reorderPlanning
function makeThrowOnErrorChain(shouldThrow = null) {
  const c = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    throwOnError: shouldThrow ? vi.fn().mockRejectedValue(shouldThrow) : vi.fn().mockResolvedValue({ error: null }),
  };
  return c;
}

beforeEach(() => vi.clearAllMocks());

describe("fetchSampels", () => {
  it("returns sampel list", async () => {
    const chain = makeOrderChain({ data: [{ id: "s1", nama: "Gamis A" }] });
    supabase.from.mockReturnValue(chain);
    const result = await fetchSampels();
    expect(result).toEqual([{ id: "s1", nama: "Gamis A" }]);
  });
  it("returns [] when data null", async () => {
    const chain = makeOrderChain({ data: null });
    supabase.from.mockReturnValue(chain);
    expect(await fetchSampels()).toEqual([]);
  });
});

describe("updateSampel", () => {
  it("calls update().eq() and logs history", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await updateSampel({ id: "s1", nomor: "SPL-001", nama: "Gamis B", tanggal: "2024-01-01", foto: [] });
    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });
  it("throws when error returned", async () => {
    const chain = makeEqChain({ data: null, error: new Error("fail") });
    supabase.from.mockReturnValue(chain);
    await expect(
      updateSampel({ id: "s1", nomor: "SPL-001", nama: "X", tanggal: "2024-01-01", foto: [] }),
    ).rejects.toThrow("fail");
  });
});

describe("createSampels", () => {
  it("inserts entries and returns inserted", async () => {
    const inserted = [{ nomor: "SPL-001", nama: "Gamis C" }];
    const chain = makeInsertSelectChain({ data: inserted, error: null });
    supabase.from.mockReturnValue(chain);
    const entries = [{ nama: "Gamis C", tanggal: "2024-01-01" }];
    const result = await createSampels(entries, [[]], { userEmail: "a@b.com", userName: "A" });
    expect(result).toEqual(inserted);
  });
  it("throws when error on insert", async () => {
    const chain = makeInsertSelectChain({ data: null, error: new Error("insert fail") });
    supabase.from.mockReturnValue(chain);
    await expect(
      createSampels([{ nama: "X", tanggal: "2024-01-01" }], [[]], { userEmail: "a@b.com", userName: "A" }),
    ).rejects.toThrow("insert fail");
  });
});

describe("createPlanning", () => {
  it("inserts entry status=planning dengan bahan_foto, model_foto, bahan_items & urutan, return inserted", async () => {
    const chain = makeInsertSelectSingleChain({
      data: { nomor: "SPL-001", nama: "Gamis Planning" },
      error: null,
    });
    supabase.from.mockReturnValue(chain);
    const bahanItems = [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard" }];
    const result = await createPlanning(
      { nama: "Gamis Planning", tanggal: "2026-08-01" },
      "https://cld/bahan.jpg",
      ["https://cld/model1.jpg", "https://cld/model2.jpg"],
      bahanItems,
      3,
      { userEmail: "a@b.com", userName: "A" },
    );
    expect(result).toEqual({ nomor: "SPL-001", nama: "Gamis Planning" });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "planning",
        bahan_foto: "https://cld/bahan.jpg",
        model_foto: ["https://cld/model1.jpg", "https://cld/model2.jpg"],
        bahan_items: bahanItems,
        urutan: 3,
        foto: [],
      }),
    );
  });

  it("bahan_foto null kalau tidak diisi, model_foto & bahan_items default [], urutan default 0", async () => {
    const chain = makeInsertSelectSingleChain({ data: { nomor: "SPL-002", nama: "X" }, error: null });
    supabase.from.mockReturnValue(chain);
    await createPlanning(
      { nama: "X", tanggal: "2026-08-01" },
      null,
      undefined,
      undefined,
      undefined,
      { userEmail: "a@b.com", userName: "A" },
    );
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ bahan_foto: null, model_foto: [], bahan_items: [], urutan: 0 }),
    );
  });

  it("throws when error on insert", async () => {
    const chain = makeInsertSelectSingleChain({ data: null, error: new Error("insert fail") });
    supabase.from.mockReturnValue(chain);
    await expect(
      createPlanning({ nama: "X", tanggal: "2026-08-01" }, null, [], [], 0, { userEmail: "a@b.com", userName: "A" }),
    ).rejects.toThrow("insert fail");
  });
});

describe("reorderPlanning", () => {
  it("update urutan per id (Promise.all)", async () => {
    const chain = makeThrowOnErrorChain();
    supabase.from.mockReturnValue(chain);
    await reorderPlanning([{ id: "s1", urutan: 0 }, { id: "s2", urutan: 1 }]);
    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.update).toHaveBeenCalledWith({ urutan: 0 });
    expect(chain.update).toHaveBeenCalledWith({ urutan: 1 });
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
    expect(chain.eq).toHaveBeenCalledWith("id", "s2");
  });

  it("tidak error pada array kosong/null", async () => {
    await expect(reorderPlanning([])).resolves.toBeUndefined();
    await expect(reorderPlanning(null)).resolves.toBeUndefined();
  });

  it("throws kalau salah satu update gagal", async () => {
    const chain = makeThrowOnErrorChain(new Error("update fail"));
    supabase.from.mockReturnValue(chain);
    await expect(reorderPlanning([{ id: "s1", urutan: 0 }])).rejects.toThrow("update fail");
  });
});

describe("markSampelDibuat", () => {
  it("update status draft + foto, target by id", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await markSampelDibuat({ id: "s1", nomor: "SPL-001", nama: "Gamis", foto: ["https://cld/jadi.jpg"] });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", foto: ["https://cld/jadi.jpg"] }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("throws on error", async () => {
    const chain = makeEqChain({ data: null, error: new Error("update fail") });
    supabase.from.mockReturnValue(chain);
    await expect(
      markSampelDibuat({ id: "s1", nomor: "SPL-001", nama: "Gamis", foto: [] }),
    ).rejects.toThrow("update fail");
  });
});

describe("saveBatchDecisions", () => {
  it("calls update for approved decision", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const decisions = { "id1": { choice: "approve", catatan: "", alasan: "" } };
    const sampelMap = { "id1": { nomor: "SPL-001", nama: "Gamis D" } };
    const result = await saveBatchDecisions(decisions, sampelMap, { userEmail: "a@b.com" });
    expect(result).toHaveLength(1);
    expect(chain.update).toHaveBeenCalled();
  });
  it("calls update for rejected decision", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const decisions = { "id2": { choice: "reject", catatan: "", alasan: "Tidak sesuai" } };
    const sampelMap = { "id2": { nomor: "SPL-002", nama: "Gamis E" } };
    await saveBatchDecisions(decisions, sampelMap, { userEmail: "a@b.com" });
    expect(chain.update).toHaveBeenCalled();
  });
  it("calls update for ditahan decision dengan ditahan_note", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const decisions = { "id5": { choice: "ditahan", catatan: "Tunggu bahan tambahan", alasan: "" } };
    const sampelMap = { "id5": { nomor: "SPL-005", nama: "Gamis F", status: "draft" } };
    await saveBatchDecisions(decisions, sampelMap, { userEmail: "a@b.com" });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ditahan", ditahan_note: "Tunggu bahan tambahan" }),
    );
  });
  it("skips entries with choice=null", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const decisions = { "id3": { choice: null, catatan: "", alasan: "" } };
    const result = await saveBatchDecisions(decisions, {}, { userEmail: "a@b.com" });
    expect(result).toHaveLength(0);
  });
  it("throws when update fails", async () => {
    const chain = makeEqChain({ data: null, error: new Error("update fail") });
    supabase.from.mockReturnValue(chain);
    const decisions = { "id4": { choice: "approve", catatan: "", alasan: "" } };
    await expect(
      saveBatchDecisions(decisions, { id4: { nomor: "X", nama: "Y" } }, { userEmail: "a@b.com" }),
    ).rejects.toThrow("update fail");
  });
});

describe("deleteSampel", () => {
  it("calls delete().eq(id) pada tabel sampel (regression: dulu salah target 'produksi_sampel')", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await deleteSampel("s1");
    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });
  it("throws on error", async () => {
    const chain = makeEqChain({ data: null, error: new Error("delete fail") });
    supabase.from.mockReturnValue(chain);
    await expect(deleteSampel("s1")).rejects.toThrow("delete fail");
  });
});
