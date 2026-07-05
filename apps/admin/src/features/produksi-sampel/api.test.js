import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchSampels, updateSampel, createSampels, saveBatchDecisions, deleteSampel } from "./api";

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
  it("calls delete().eq(id)", async () => {
    const chain = makeEqChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await deleteSampel("s1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "s1");
  });
  it("throws on error", async () => {
    const chain = makeEqChain({ data: null, error: new Error("del fail") });
    supabase.from.mockReturnValue(chain);
    await expect(deleteSampel("s2")).rejects.toThrow("del fail");
  });
});
