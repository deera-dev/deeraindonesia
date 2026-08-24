import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchStokAll, fetchSoldKodesAtLocation } from "./api";

beforeEach(() => vi.clearAllMocks());

describe("fetchStokAll", () => {
  it("returns all stok_warna rows (semua lokasi)", async () => {
    const rows = [
      { id: "s1", kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 5, cideng: 1, tegalgubug: 0 },
    ];
    const chain = { select: vi.fn().mockResolvedValue({ data: rows, error: null }) };
    supabase.from.mockReturnValue(chain);
    const result = await fetchStokAll();
    expect(result).toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("stok_warna");
  });

  it("returns [] when data null", async () => {
    const chain = { select: vi.fn().mockResolvedValue({ data: null, error: null }) };
    supabase.from.mockReturnValue(chain);
    expect(await fetchStokAll()).toEqual([]);
  });

  it("throws on error", async () => {
    const chain = { select: vi.fn().mockResolvedValue({ data: null, error: new Error("db fail") }) };
    supabase.from.mockReturnValue(chain);
    await expect(fetchStokAll()).rejects.toThrow("db fail");
  });
});

describe("fetchSoldKodesAtLocation", () => {
  function makeChain(returnVal) {
    const c = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue(returnVal),
    };
    return c;
  }

  it("returns [] kalau location kosong (tanpa query)", async () => {
    const result = await fetchSoldKodesAtLocation(null, "2026-08-01");
    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("mengumpulkan kode unik dari items, hanya type=sale", async () => {
    const chain = makeChain({
      data: [
        { type: "sale", items: [{ kode: "D-01-OSK" }, { kode: "D-02-SFN" }] },
        { type: "sale", items: [{ kode: "D-01-OSK" }] }, // duplikat, harus unik
        { type: "retur", items: [{ kode: "D-99-XXX" }] }, // retur diabaikan
      ],
      error: null,
    });
    supabase.from.mockReturnValue(chain);
    const result = await fetchSoldKodesAtLocation("cideng", "2026-08-01");
    expect(result.sort()).toEqual(["D-01-OSK", "D-02-SFN"]);
    expect(supabase.from).toHaveBeenCalledWith("sales");
    expect(chain.eq).toHaveBeenCalledWith("location", "cideng");
    expect(chain.gte).toHaveBeenCalledWith("date", "2026-08-01");
  });

  it("mengabaikan item tanpa kode & items null", async () => {
    const chain = makeChain({
      data: [
        { type: "sale", items: [{ qty: 1 }] },
        { type: "sale", items: null },
      ],
      error: null,
    });
    supabase.from.mockReturnValue(chain);
    expect(await fetchSoldKodesAtLocation("cideng", "2026-08-01")).toEqual([]);
  });

  it("returns [] when data null", async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    expect(await fetchSoldKodesAtLocation("cideng", "2026-08-01")).toEqual([]);
  });

  it("throws on error", async () => {
    const chain = makeChain({ data: null, error: new Error("query fail") });
    supabase.from.mockReturnValue(chain);
    await expect(fetchSoldKodesAtLocation("cideng", "2026-08-01")).rejects.toThrow("query fail");
  });
});
