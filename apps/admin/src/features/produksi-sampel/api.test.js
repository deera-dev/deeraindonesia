import { beforeEach, describe, expect, it, vi } from "vitest";

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
  approveRepeat,
  createPlanning,
  deleteSampel,
  fetchSampels,
  logWorkOrder,
  markSampelDibuat,
  mundurStepSampel,
  previousStepPatch,
  reorderPlanning,
  saveBatchDecisions,
  saveWoDraft,
  setWoSelesai,
  togglePinned,
  updatePlanning,
  updateSampel,
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
    await updateSampel({
      id: "s1",
      nomor: "SPL-001",
      nama: "Gamis B",
      tanggal: "2024-01-01",
      foto: [],
    });
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

describe("createPlanning", () => {
  // Insert tunggal, sudah atomik dari sananya — sekarang 1 RPC
  // (create_sampel_planning), identitas dari auth.uid() bukan
  // userEmail/userName client — lihat
  // supabase/migrations/20261120_produksi_sampel_crud.sql.
  it("memanggil create_sampel_planning dengan bahan_foto, model_foto, bahan_items & urutan", async () => {
    supabase.rpc.mockResolvedValue({
      data: { nomor: "SPL-001", nama: "Gamis Planning" },
      error: null,
    });
    const bahanItems = [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard" }];
    const result = await createPlanning(
      { nama: "Gamis Planning", tanggal: "2026-08-01" },
      "https://cld/bahan.jpg",
      ["https://cld/model1.jpg", "https://cld/model2.jpg"],
      bahanItems,
      3,
    );
    expect(result).toEqual({ nomor: "SPL-001", nama: "Gamis Planning" });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_sampel_planning",
      expect.objectContaining({
        p_nama: "Gamis Planning",
        p_bahan_foto_url: "https://cld/bahan.jpg",
        p_model_foto_urls: ["https://cld/model1.jpg", "https://cld/model2.jpg"],
        p_bahan_items: bahanItems,
        p_urutan: 3,
      }),
    );
  });

  it("bahan_foto null kalau tidak diisi, model_foto & bahan_items default [], urutan default 0", async () => {
    supabase.rpc.mockResolvedValue({ data: { nomor: "SPL-002", nama: "X" }, error: null });
    await createPlanning(
      { nama: "X", tanggal: "2026-08-01" },
      null,
      undefined,
      undefined,
      undefined,
    );
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_sampel_planning",
      expect.objectContaining({
        p_bahan_foto_url: null,
        p_model_foto_urls: [],
        p_bahan_items: [],
        p_urutan: 0,
      }),
    );
  });

  it("throws when RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "insert fail" } });
    await expect(
      createPlanning({ nama: "X", tanggal: "2026-08-01" }, null, [], [], 0),
    ).rejects.toThrow("insert fail");
  });
});

describe("reorderPlanning", () => {
  // Dulu Promise.all dari N update independen — sekarang 1 RPC atomik.
  it("memanggil reorder_sampel_planning dengan updates", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await reorderPlanning([
      { id: "s1", urutan: 0 },
      { id: "s2", urutan: 1 },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_sampel_planning", {
      p_updates: [
        { id: "s1", urutan: 0 },
        { id: "s2", urutan: 1 },
      ],
    });
  });

  it("tidak panggil RPC pada array kosong/null", async () => {
    await expect(reorderPlanning([])).resolves.toBeUndefined();
    await expect(reorderPlanning(null)).resolves.toBeUndefined();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "update fail" } });
    await expect(reorderPlanning([{ id: "s1", urutan: 0 }])).rejects.toThrow("update fail");
  });
});

describe("markSampelDibuat", () => {
  it("update status draft + foto, target by id", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await markSampelDibuat({
      id: "s1",
      nomor: "SPL-001",
      nama: "Gamis",
      foto: ["https://cld/jadi.jpg"],
    });
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
    supabase.rpc.mockResolvedValue({ data: { nomor: "SPL-9", nama: "Repeat X" }, error: null });
    await createPlanning(
      { nama: "Repeat X", tanggal: "2026-10-08", repeat: { id: "p1", kode: "D-07-OSK" } },
      null,
      [],
      [],
      0,
    );
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_sampel_planning",
      expect.objectContaining({
        p_is_repeat: true,
        p_repeat_dari_id: "p1",
        p_repeat_dari_kode: "D-07-OSK",
      }),
    );
  });

  it("tanpa repeat -> is_repeat false, repeat_dari_* null", async () => {
    supabase.rpc.mockResolvedValue({ data: { nomor: "SPL-9", nama: "X" }, error: null });
    await createPlanning({ nama: "X", tanggal: "2026-10-08" }, null, [], [], 0);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_sampel_planning",
      expect.objectContaining({
        p_is_repeat: false,
        p_repeat_dari_id: null,
        p_repeat_dari_kode: null,
      }),
    );
  });
});

describe("approveRepeat", () => {
  // Update tunggal, sudah atomik dari sananya — sekarang 1 RPC
  // (approve_sampel_repeat), approved_by dari auth.uid() bukan userEmail
  // client.
  it("memanggil approve_sampel_repeat dengan id/foto/catatan", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await approveRepeat({ id: "p1", foto: ["f1"], catatan: "" });
    expect(supabase.rpc).toHaveBeenCalledWith("approve_sampel_repeat", {
      p_id: "p1",
      p_foto: ["f1"],
      p_catatan: null,
    });
  });

  it("catatan terisi diteruskan apa adanya", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await approveRepeat({ id: "p1", foto: [], catatan: "kancing beda" });
    expect(supabase.rpc).toHaveBeenCalledWith("approve_sampel_repeat", {
      p_id: "p1",
      p_foto: [],
      p_catatan: "kancing beda",
    });
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "boom" } });
    await expect(approveRepeat({ id: "p1", foto: [] })).rejects.toThrow("boom");
  });
});

describe("setWoSelesai", () => {
  it("selesai=true mengisi wo_selesai_at, false mengosongkan; dicatat di history", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await setWoSelesai({ id: "s1", nomor: "N1", nama: "X", selesai: true });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ wo_selesai_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "sampel-wo-selesai" }),
    );
    await setWoSelesai({ id: "s1", nomor: "N1", nama: "X", selesai: false });
    expect(chain.update).toHaveBeenLastCalledWith(expect.objectContaining({ wo_selesai_at: null }));
  });
  it("throws on error", async () => {
    supabase.from.mockReturnValue(makeEqChain({ data: null, error: new Error("boom") }));
    await expect(setWoSelesai({ id: "s1", selesai: true })).rejects.toThrow("boom");
  });
});

describe("saveBatchDecisions", () => {
  // Dulu Promise.all dari N update independen tanpa transaction —
  // sekarang 1 RPC atomik (save_batch_decisions_sampel). notify-
  // sampel-status TETAP fire-and-forget di luar RPC.
  it("memanggil save_batch_decisions_sampel dengan decisions yang sudah difilter choice!=null", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    const decisions = { id1: { choice: "approve", catatan: "", alasan: "" } };
    const sampelMap = { id1: { nomor: "SPL-001", nama: "Gamis D" } };
    const result = await saveBatchDecisions(decisions, sampelMap, "a@b.com");
    expect(result).toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledWith("save_batch_decisions_sampel", {
      p_decisions: [{ id: "id1", choice: "approve", catatan: null, alasan: null }],
    });
  });

  it("skips entries with choice=null (tidak panggil RPC kalau kosong semua)", async () => {
    const decisions = { id3: { choice: null, catatan: "", alasan: "" } };
    const result = await saveBatchDecisions(decisions, {}, "a@b.com");
    expect(result).toHaveLength(0);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("throws when RPC fails", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "update fail" } });
    const decisions = { id4: { choice: "approve", catatan: "", alasan: "" } };
    await expect(
      saveBatchDecisions(decisions, { id4: { nomor: "X", nama: "Y" } }, "a@b.com"),
    ).rejects.toThrow("update fail");
  });

  it("trigger notify-sampel-status (best-effort) ke pembuat planning, permintaan Denny 2026-09", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    const decisions = { id6: { choice: "approve", catatan: "", alasan: "" } };
    const sampelMap = {
      id6: { nomor: "SPL-006", nama: "Gamis G", status: "draft", created_by: "pembuat@deera.id" },
    };

    await saveBatchDecisions(decisions, sampelMap, "reviewer@deera.id");

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
    supabase.rpc.mockResolvedValue({ error: null });
    supabase.functions.invoke.mockRejectedValueOnce(new Error("edge fn down"));
    const decisions = { id7: { choice: "reject", catatan: "", alasan: "Tidak sesuai" } };
    const sampelMap = {
      id7: { nomor: "SPL-007", nama: "Gamis H", status: "draft", created_by: "pembuat@deera.id" },
    };

    await expect(
      saveBatchDecisions(decisions, sampelMap, "reviewer@deera.id"),
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

describe("logWorkOrder (permintaan Denny 2026-09: Work Order untuk tukang potong; 2026-10-20: persist wo_sizes agar tidak hilang)", () => {
  it("update sampel dgn wo_sizes, lalu catat ke logHistory dengan action sampel-wo-buat", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const sampel = {
      id: "s0",
      nomor: "SPL-20260902-ABC",
      nama: "Gamis Arkana",
      status: "approved",
    };
    await logWorkOrder({ sampel, sizes: ["Midi", "Gamis"] });

    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.update).toHaveBeenCalledWith({
      wo_sizes: ["Midi", "Gamis"],
      wo_catatan_zona: null,
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "s0");

    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "sampel-wo-buat",
        category: "produksi",
        kode: "SPL-20260902-ABC",
        nama: "Gamis Arkana",
        snapshot: { sizes: ["Midi", "Gamis"], zonaCatatan: null },
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
      wo_catatan_zona: null,
      wo_sampel_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("bukan planning / sudah ada wo_sampel_at: patch tanpa wo_sampel_at, tetap update wo_sizes", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await logWorkOrder({ sampel: { id: "s2", nomor: "SPL-2", nama: "B", status: "approved" } });
    expect(chain.update).toHaveBeenCalledWith({ wo_sizes: [], wo_catatan_zona: null });

    const chain2 = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain2);
    await logWorkOrder({
      sampel: {
        id: "s3",
        nomor: "SPL-3",
        nama: "C",
        status: "planning",
        wo_sampel_at: "2026-10-17",
      },
    });
    expect(chain2.update).toHaveBeenCalledWith({ wo_sizes: [], wo_catatan_zona: null });
  });

  it("sizes default [] kalau tidak diisi", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const sampel = { id: "s4", nomor: "SPL-002", nama: "Gamis B", status: "approved" };
    await logWorkOrder({ sampel });

    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: { sizes: [], zonaCatatan: null } }),
    );
  });

  it("zonaCatatan dgn isi -> disimpan apa adanya sbg wo_catatan_zona; kosong -> null", async () => {
    const isi = {
      dada: { catatan: "motif, bukan polos", crop: null },
      bawah: { catatan: "", crop: null },
    };
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await logWorkOrder({
      sampel: { id: "s6", nomor: "SPL-6", nama: "F", status: "approved" },
      zonaCatatan: isi,
    });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ wo_catatan_zona: isi }));

    const kosong = { dada: { catatan: "   ", crop: null } };
    const chain2 = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain2);
    await logWorkOrder({
      sampel: { id: "s7", nomor: "SPL-7", nama: "G", status: "approved" },
      zonaCatatan: kosong,
    });
    expect(chain2.update).toHaveBeenCalledWith(expect.objectContaining({ wo_catatan_zona: null }));
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

describe("saveWoDraft (Denny 2026-11-02: 'ada simpan sebagai draft kalau belum mau diprint')", () => {
  it("update wo_sizes & wo_catatan_zona TANPA set wo_sampel_at dan TANPA logHistory", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const isi = { dada: { catatan: "renda ga dipake", crop: null, aktif: true } };
    await saveWoDraft({
      sampel: { id: "s1", nomor: "SPL-1", nama: "A", status: "planning" },
      sizes: ["Midi"],
      zonaCatatan: isi,
    });

    expect(supabase.from).toHaveBeenCalledWith("sampel");
    expect(chain.update).toHaveBeenCalledWith({ wo_sizes: ["Midi"], wo_catatan_zona: isi });
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
    expect(logHistory).not.toHaveBeenCalled();
  });

  it("sizes default [] dan zonaCatatan kosong -> null", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await saveWoDraft({ sampel: { id: "s2" } });
    expect(chain.update).toHaveBeenCalledWith({ wo_sizes: [], wo_catatan_zona: null });
  });

  it("throws kalau update gagal", async () => {
    const chain = makeEqChain({ data: null, error: new Error("update fail") });
    supabase.from.mockReturnValue(chain);
    await expect(saveWoDraft({ sampel: { id: "s3" } })).rejects.toThrow("update fail");
  });
});

describe("updatePlanning", () => {
  it("update nama/tanggal/model_foto/bahan_items by id, status & foto sampel tidak disentuh", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await updatePlanning({
      id: "p1",
      nomor: "N",
      nama: "Baru",
      tanggal: "2026-10-14",
      modelFotoUrls: ["m"],
      bahanItems: [{ nama_bahan: "W" }],
    });
    const patch = chain.update.mock.calls[0][0];
    expect(patch).toEqual(
      expect.objectContaining({
        nama: "Baru",
        model_foto: ["m"],
        bahan_items: [{ nama_bahan: "W" }],
        bahan_foto: null,
      }),
    );
    expect(patch).not.toHaveProperty("status");
    expect(patch).not.toHaveProperty("foto");
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "sampel-planning-edit" }),
    );
  });
  it("throws on error", async () => {
    supabase.from.mockReturnValue(makeEqChain({ data: null, error: new Error("boom") }));
    await expect(updatePlanning({ id: "p1", nama: "x" })).rejects.toThrow("boom");
  });
});

describe("previousStepPatch / mundurStepSampel (kembali ke step sebelumnya)", () => {
  const now = "2026-10-17T00:00:00.000Z";
  it("Selesai → Work Order: hapus wo_selesai_at", () => {
    expect(previousStepPatch({ status: "approved", wo_selesai_at: "x" }, now)).toEqual({
      step: "approved",
      patch: { wo_selesai_at: null },
    });
  });
  it("Work Order → Sampel: draft bila ada foto sampel, selain itu 'sedang dibuat'", () => {
    const a = previousStepPatch({ status: "approved", foto: ["f.jpg"] }, now);
    expect(a.patch).toMatchObject({ status: "draft", approved_by: null, approved_at: null });
    const b = previousStepPatch({ status: "approved", foto: [] }, now);
    expect(b.patch).toMatchObject({ status: "planning", wo_sampel_at: now, approved_by: null });
  });
  it("Sampel → Rencana: planning tanpa wo_sampel_at", () => {
    expect(previousStepPatch({ status: "draft" }, now).patch).toEqual({
      status: "planning",
      wo_sampel_at: null,
    });
    expect(previousStepPatch({ status: "planning", wo_sampel_at: "x" }, now).patch).toEqual({
      status: "planning",
      wo_sampel_at: null,
    });
  });
  it("Rencana: tidak ada step sebelumnya", () => {
    expect(previousStepPatch({ status: "planning" }, now)).toBeNull();
  });
  it("mundurStepSampel meng-update tabel sampel & mengembalikan nama step", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    const step = await mundurStepSampel({ id: "s1", nomor: "N", nama: "A", status: "draft" });
    expect(step).toBe("planning");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "planning", wo_sampel_at: null }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });
});
