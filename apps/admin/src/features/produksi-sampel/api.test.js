import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import {
  fetchSampels,
  updateSampel,
  createSampels,
  createPlanning,
  reorderPlanning,
  markSampelDibuat,
  approveRepeat,
  lanjutKeWorkOrder,
  setWoSelesai,
  updatePlanning,
  saveBatchDecisions,
  deleteSampel,
  togglePinned,
  logWorkOrder,
  previousStepPatch,
  mundurStepSampel,
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
function makeInsertSelectChain(returnVal = { data: [], error: null }) {
  const c = {
    select: vi.fn().mockResolvedValue(returnVal),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  return c;
}
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
function makeSelectTerminalChain(returnVal = { data: [], error: null }) {
  return {
    select: vi.fn().mockResolvedValue(returnVal),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
  };
}
function makeUpsertChain(returnVal = { data: null, error: null }) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(returnVal),
  };
}
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

describe("createPlanning — repeat", () => {
  it("entry.repeat -> is_repeat + repeat_dari_id/nomor tersimpan", async () => {
    const chain = makeInsertSelectSingleChain({ data: { nomor: "SPL-9", nama: "Repeat X" }, error: null });
    supabase.from.mockReturnValue(chain);
    await createPlanning(
      { nama: "Repeat X", tanggal: "2026-10-08", repeat: { id: "p1", kode: "D-07-OSK" } },
      null, [], [], 0, { userEmail: "a@b.com", userName: "A" },
    );
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_repeat: true, repeat_dari_id: "p1", repeat_dari_kode: "D-07-OSK" }),
    );
  });

  it("tanpa repeat -> tidak ada field is_repeat", async () => {
    const chain = makeInsertSelectSingleChain({ data: { nomor: "SPL-9", nama: "X" }, error: null });
    supabase.from.mockReturnValue(chain);
    await createPlanning({ nama: "X", tanggal: "2026-10-08" }, null, [], [], 0, { userEmail: "a", userName: "A" });
    expect(chain.insert.mock.calls[0][0]).not.toHaveProperty("is_repeat");
  });
});

describe("approveRepeat", () => {
  it("approved + foto acuan disalin + sesuai_sampel true, target by id, tercatat di history", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await approveRepeat(
      { id: "p1", nomor: "SPL-9", nama: "Repeat X", foto: ["f1"], catatan: "" },
      { userEmail: "a@b.com" },
    );
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", foto: ["f1"], sesuai_sampel: true, perubahan: null, approved_by: "a@b.com" }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "sampel-approve-repeat", kode: "SPL-9" }));
  });

  it("catatan -> sesuai_sampel false + perubahan terisi", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await approveRepeat({ id: "p1", nomor: "N", nama: "X", foto: [], catatan: "kancing beda" }, { userEmail: "a" });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ sesuai_sampel: false, perubahan: "kancing beda" }));
  });

  it("throws on error", async () => {
    supabase.from.mockReturnValue(makeEqChain({ data: null, error: new Error("boom") }));
    await expect(approveRepeat({ id: "p1", nomor: "N", nama: "X", foto: [] }, { userEmail: "a" })).rejects.toThrow("boom");
  });
});

describe("setWoSelesai", () => {
  it("selesai=true mengisi wo_selesai_at, false mengosongkan; dicatat di history", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await setWoSelesai({ id: "s1", nomor: "N1", nama: "X", selesai: true });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ wo_selesai_at: expect.any(String) }));
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "sampel-wo-selesai" }));
    await setWoSelesai({ id: "s1", nomor: "N1", nama: "X", selesai: false });
    expect(chain.update).toHaveBeenLastCalledWith(expect.objectContaining({ wo_selesai_at: null }));
  });
  it("throws on error", async () => {
    supabase.from.mockReturnValue(makeEqChain({ data: null, error: new Error("boom") }));
    await expect(setWoSelesai({ id: "s1", selesai: true })).rejects.toThrow("boom");
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

  it("trigger notify-sampel-status (best-effort) ke pembuat planning, permintaan Denny 2026-09", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const decisions = { id6: { choice: "approve", catatan: "", alasan: "" } };
    const sampelMap = { id6: { nomor: "SPL-006", nama: "Gamis G", status: "draft", created_by: "pembuat@deera.id" } };

    await saveBatchDecisions(decisions, sampelMap, { userEmail: "reviewer@deera.id" });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "notify-sampel-status",
      expect.objectContaining({
        body: expect.objectContaining({
          sampelId: "id6",
          sampelNomor: "SPL-006",
          newStatus: "approved",
          creatorEmail: "pembuat@deera.id",
          actorEmail: "reviewer@deera.id",
        }),
      }),
    );
  });

  it("notify-sampel-status gagal TIDAK melempar error (fire-and-forget)", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    supabase.functions.invoke.mockRejectedValueOnce(new Error("edge fn down"));
    const decisions = { id7: { choice: "reject", catatan: "", alasan: "Tidak sesuai" } };
    const sampelMap = { id7: { nomor: "SPL-007", nama: "Gamis H", status: "draft", created_by: "pembuat@deera.id" } };

    await expect(
      saveBatchDecisions(decisions, sampelMap, { userEmail: "reviewer@deera.id" }),
    ).resolves.toBeDefined();
  });
});

describe("togglePinned (permintaan Denny 2026-09: pin planning penting)", () => {
  it("update kolom pinned by id", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await togglePinned("s1", true);
    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.update).toHaveBeenCalledWith({ pinned: true });
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("throws on error", async () => {
    const chain = makeEqChain({ data: null, error: new Error("update fail") });
    supabase.from.mockReturnValue(chain);
    await expect(togglePinned("s1", false)).rejects.toThrow("update fail");
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

describe("logWorkOrder (permintaan Denny 2026-09: Work Order untuk tukang potong; 2026-10-20: persist wo_sizes/wo_catatan agar tidak hilang)", () => {
  it("update sampel dgn wo_sizes & wo_catatan, lalu catat ke logHistory dengan action sampel-wo-buat", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const sampel = { id: "s0", nomor: "SPL-20260902-ABC", nama: "Gamis Arkana", status: "approved" };
    await logWorkOrder({ sampel, sizes: ["Midi", "Gamis"], catatanPenting: "Kancing dipindah ke kiri" });

    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.update).toHaveBeenCalledWith({
      wo_sizes: ["Midi", "Gamis"],
      wo_catatan: "Kancing dipindah ke kiri",
      wo_catatan_zona: null,
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "s0");

    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "sampel-wo-buat",
        category: "produksi",
        kode: "SPL-20260902-ABC",
        nama: "Gamis Arkana",
        snapshot: { sizes: ["Midi", "Gamis"], catatanPenting: "Kancing dipindah ke kiri", zonaCatatan: null },
      }),
    );
  });

  it("planning tanpa wo_sampel_at: patch termasuk wo_sampel_at (pindah ke step Sampel)", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await logWorkOrder({ sampel: { id: "s1", nomor: "SPL-1", nama: "A", status: "planning" } });
    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.update).toHaveBeenCalledWith({
      wo_sizes: [],
      wo_catatan: null,
      wo_catatan_zona: null,
      wo_sampel_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("bukan planning / sudah ada wo_sampel_at: patch tanpa wo_sampel_at, tetap update wo_sizes/wo_catatan", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await logWorkOrder({ sampel: { id: "s2", nomor: "SPL-2", nama: "B", status: "approved" } });
    expect(chain.update).toHaveBeenCalledWith({ wo_sizes: [], wo_catatan: null, wo_catatan_zona: null });

    const chain2 = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain2);
    await logWorkOrder({ sampel: { id: "s3", nomor: "SPL-3", nama: "C", status: "planning", wo_sampel_at: "2026-10-17" } });
    expect(chain2.update).toHaveBeenCalledWith({ wo_sizes: [], wo_catatan: null, wo_catatan_zona: null });
  });

  it("sizes default [] & catatanPenting default null kalau tidak diisi", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const sampel = { id: "s4", nomor: "SPL-002", nama: "Gamis B", status: "approved" };
    await logWorkOrder({ sampel });

    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: { sizes: [], catatanPenting: null, zonaCatatan: null } }),
    );
  });

  it("zonaCatatan dgn isi -> disimpan apa adanya sbg wo_catatan_zona; kosong -> null", async () => {
    const isi = { dada: { catatan: "motif, bukan polos", crop: null }, bawah: { catatan: "", crop: null } };
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await logWorkOrder({ sampel: { id: "s6", nomor: "SPL-6", nama: "F", status: "approved" }, zonaCatatan: isi });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ wo_catatan_zona: isi }),
    );

    const kosong = { dada: { catatan: "   ", crop: null } };
    const chain2 = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain2);
    await logWorkOrder({ sampel: { id: "s7", nomor: "SPL-7", nama: "G", status: "approved" }, zonaCatatan: kosong });
    expect(chain2.update).toHaveBeenCalledWith(
      expect.objectContaining({ wo_catatan_zona: null }),
    );
  });

  it("throws kalau update sampel gagal, tidak lanjut logHistory", async () => {
    const chain = makeEqChain({ data: null, error: new Error("update fail") });
    supabase.from.mockReturnValue(chain);
    await expect(
      logWorkOrder({ sampel: { id: "s5", nomor: "SPL-5", nama: "E", status: "approved" } }),
    ).rejects.toThrow("update fail");
    expect(logHistory).not.toHaveBeenCalled();
  });
});

describe("updatePlanning", () => {
  it("update nama/tanggal/model_foto/bahan_items by id, status & foto sampel tidak disentuh", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await updatePlanning({ id: "p1", nomor: "N", nama: "Baru", tanggal: "2026-10-14", modelFotoUrls: ["m"], bahanItems: [{ nama_bahan: "W" }] });
    const patch = chain.update.mock.calls[0][0];
    expect(patch).toEqual(expect.objectContaining({ nama: "Baru", model_foto: ["m"], bahan_items: [{ nama_bahan: "W" }], bahan_foto: null }));
    expect(patch).not.toHaveProperty("status");
    expect(patch).not.toHaveProperty("foto");
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "sampel-planning-edit" }));
  });
  it("throws on error", async () => {
    supabase.from.mockReturnValue(makeEqChain({ data: null, error: new Error("boom") }));
    await expect(updatePlanning({ id: "p1", nama: "x" })).rejects.toThrow("boom");
  });
});

describe("lanjutKeWorkOrder", () => {
  it("planning -> approved tanpa menyentuh foto, target by id, tercatat di history", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const res = await lanjutKeWorkOrder({ id: "p1", nomor: "SPL-9", nama: "X" }, { userEmail: "a@b.com" });
    const payload = chain.update.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ status: "approved", sesuai_sampel: true, approved_by: "a@b.com" }));
    expect(payload).not.toHaveProperty("foto");
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "sampel-lanjut-wo", kode: "SPL-9" }));
    expect(res.approved_by).toBe("a@b.com");
  });

  it("throws on error", async () => {
    supabase.from.mockReturnValue(makeEqChain({ data: null, error: new Error("boom") }));
    await expect(lanjutKeWorkOrder({ id: "p1", nomor: "N", nama: "X" }, { userEmail: "a" })).rejects.toThrow("boom");
  });
});

describe("previousStepPatch / mundurStepSampel (kembali ke step sebelumnya)", () => {
  const now = "2026-10-17T00:00:00.000Z";
  it("Selesai → Work Order: hapus wo_selesai_at", () => {
    expect(previousStepPatch({ status: "approved", wo_selesai_at: "x" }, now)).toEqual({ step: "approved", patch: { wo_selesai_at: null } });
  });
  it("Work Order → Sampel: draft bila ada foto sampel, selain itu 'sedang dibuat'", () => {
    const a = previousStepPatch({ status: "approved", foto: ["f.jpg"] }, now);
    expect(a.patch).toMatchObject({ status: "draft", approved_by: null, approved_at: null });
    const b = previousStepPatch({ status: "approved", foto: [] }, now);
    expect(b.patch).toMatchObject({ status: "planning", wo_sampel_at: now, approved_by: null });
  });
  it("Sampel → Rencana: planning tanpa wo_sampel_at", () => {
    expect(previousStepPatch({ status: "draft" }, now).patch).toEqual({ status: "planning", wo_sampel_at: null });
    expect(previousStepPatch({ status: "planning", wo_sampel_at: "x" }, now).patch).toEqual({ status: "planning", wo_sampel_at: null });
  });
  it("Rencana: tidak ada step sebelumnya", () => {
    expect(previousStepPatch({ status: "planning" }, now)).toBeNull();
  });
  it("mundurStepSampel meng-update tabel sampel & mengembalikan nama step", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const step = await mundurStepSampel({ id: "s1", nomor: "N", nama: "A", status: "draft" });
    expect(step).toBe("planning");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "planning", wo_sampel_at: null }));
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });
});
