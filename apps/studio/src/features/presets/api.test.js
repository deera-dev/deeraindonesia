import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select", "eq", "order", "insert", "update", "delete", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

import { supabase } from "@deera/shared/lib/supabase";
import {
  createAccessoryPreset,
  createBackgroundPreset,
  deleteAccessoryPreset,
  deleteBackgroundPreset,
  fetchAccessoryPresets,
  fetchBackgroundPresets,
  updateAccessoryPreset,
  updateBackgroundPreset,
} from "./api";

const chain = supabase._chain;

beforeEach(() => {
  vi.clearAllMocks();
});

const bgRow = {
  id: "bg1",
  name: "Lounge Marmer",
  prompt_fragment: "lounge butik mewah",
  reference_image_url: null,
  mood_tags: [],
  warna_affinity: [],
  cocok_untuk_kategori: [],
  last_used_at: null,
  use_count: 0,
  is_active: true,
  created_at: "2026-01-01",
};

describe("background presets", () => {
  it("fetchBackgroundPresets orders by name", async () => {
    chain.then = (resolve) => resolve({ data: [bgRow], error: null });
    const res = await fetchBackgroundPresets();
    expect(chain.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(res).toHaveLength(1);
  });

  it("fetchBackgroundPresets returns [] when null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchBackgroundPresets()).toEqual([]);
  });

  it("fetchBackgroundPresets throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fail") });
    await expect(fetchBackgroundPresets()).rejects.toThrow("fail");
  });

  it("createBackgroundPreset inserts payload", async () => {
    chain.then = (resolve) => resolve({ data: bgRow, error: null });
    const input = {
      name: "Lounge Marmer",
      prompt_fragment: "lounge butik mewah",
      reference_image_url: null,
      mood_tags: [],
      warna_affinity: [],
      cocok_untuk_kategori: [],
    };
    const res = await createBackgroundPreset(input);
    expect(chain.insert).toHaveBeenCalledWith(input);
    expect(res).toEqual(bgRow);
  });

  it("updateBackgroundPreset updates by id", async () => {
    chain.then = (resolve) => resolve({ data: bgRow, error: null });
    await updateBackgroundPreset({ id: "bg1", patch: { is_active: false } });
    expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "bg1");
  });

  it("deleteBackgroundPreset deletes by id", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deleteBackgroundPreset("bg1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "bg1");
  });
});

const accRow = {
  id: "acc1",
  category: "tas",
  name: "Clutch Emas",
  prompt_fragment: "clutch beludru",
  reference_image_url: null,
  is_active: true,
  created_at: "2026-01-01",
};

describe("accessory presets", () => {
  it("fetchAccessoryPresets orders by category then name", async () => {
    chain.then = (resolve) => resolve({ data: [accRow], error: null });
    const res = await fetchAccessoryPresets();
    expect(chain.order).toHaveBeenNthCalledWith(1, "category", { ascending: true });
    expect(chain.order).toHaveBeenNthCalledWith(2, "name", { ascending: true });
    expect(res).toHaveLength(1);
  });

  it("fetchAccessoryPresets throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fail") });
    await expect(fetchAccessoryPresets()).rejects.toThrow("fail");
  });

  it("createAccessoryPreset inserts payload", async () => {
    chain.then = (resolve) => resolve({ data: accRow, error: null });
    const input = {
      category: "tas",
      name: "Clutch Emas",
      prompt_fragment: "clutch beludru",
      reference_image_url: null,
    };
    const res = await createAccessoryPreset(input);
    expect(chain.insert).toHaveBeenCalledWith(input);
    expect(res).toEqual(accRow);
  });

  it("updateAccessoryPreset updates by id", async () => {
    chain.then = (resolve) => resolve({ data: accRow, error: null });
    await updateAccessoryPreset({ id: "acc1", patch: { is_active: false } });
    expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "acc1");
  });

  it("deleteAccessoryPreset deletes by id", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deleteAccessoryPreset("acc1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "acc1");
  });
});
