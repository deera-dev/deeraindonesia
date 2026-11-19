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
import { createModel, deleteModel, fetchModels, updateModel } from "./api";

const chain = supabase._chain;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchModels", () => {
  it("orders by created_at desc when onlyActive is false", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          { id: "m1", name: "A", thumbnail_url: null, is_active: true, created_at: "2026-01-01" },
        ],
        error: null,
      });
    const res = await fetchModels(false);
    expect(res).toHaveLength(1);
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("filters is_active and orders by name when onlyActive is true", async () => {
    chain.then = (resolve) => resolve({ data: [], error: null });
    await fetchModels(true);
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
    expect(chain.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("returns [] when data is null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchModels()).toEqual([]);
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fail") });
    await expect(fetchModels()).rejects.toThrow("fail");
  });
});

describe("createModel", () => {
  it("inserts and returns the new row", async () => {
    const row = {
      id: "m1",
      name: "Model A",
      thumbnail_url: null,
      is_active: true,
      created_at: "2026-01-01",
    };
    chain.then = (resolve) => resolve({ data: row, error: null });
    const res = await createModel({ name: "Model A", thumbnail_url: null });
    expect(chain.insert).toHaveBeenCalledWith({ name: "Model A", thumbnail_url: null });
    expect(res).toEqual(row);
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("dup") });
    await expect(createModel({ name: "x", thumbnail_url: null })).rejects.toThrow("dup");
  });
});

describe("updateModel", () => {
  it("updates by id and returns the row", async () => {
    const row = {
      id: "m1",
      name: "New",
      thumbnail_url: null,
      is_active: false,
      created_at: "2026-01-01",
    };
    chain.then = (resolve) => resolve({ data: row, error: null });
    const res = await updateModel({ id: "m1", patch: { is_active: false } });
    expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "m1");
    expect(res).toEqual(row);
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("nope") });
    await expect(updateModel({ id: "m1", patch: {} })).rejects.toThrow("nope");
  });
});

describe("deleteModel", () => {
  it("deletes by id", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deleteModel("m1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "m1");
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ error: new Error("fail") });
    await expect(deleteModel("m1")).rejects.toThrow("fail");
  });
});
