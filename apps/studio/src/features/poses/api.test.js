import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select", "eq", "neq", "order", "insert", "update", "delete", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

import { supabase } from "@deera/shared/lib/supabase";
import { createPose, deletePose, fetchPoses, setBackView, updatePose } from "./api";

const chain = supabase._chain;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchPoses", () => {
  it("filters by model_id and orders by created_at desc", async () => {
    chain.then = (resolve) =>
      resolve({
        data: [
          {
            id: "p1",
            model_id: "m1",
            name: "Berdiri",
            reference_image_url: "http://x/y.jpg",
            description: null,
            source: "vendor_archive",
            is_active: true,
            is_back_view: false,
            created_at: "2026-01-01",
          },
        ],
        error: null,
      });
    const res = await fetchPoses("m1");
    expect(chain.eq).toHaveBeenCalledWith("model_id", "m1");
    expect(res).toHaveLength(1);
  });

  it("returns [] when data is null", async () => {
    chain.then = (resolve) => resolve({ data: null, error: null });
    expect(await fetchPoses("m1")).toEqual([]);
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("fail") });
    await expect(fetchPoses("m1")).rejects.toThrow("fail");
  });
});

describe("createPose", () => {
  it("inserts the full payload", async () => {
    const row = { id: "p1" };
    chain.then = (resolve) => resolve({ data: row, error: null });
    const input = {
      model_id: "m1",
      name: "Berdiri",
      description: null,
      source: "vendor_archive",
      reference_image_url: "http://x/y.jpg",
    };
    const res = await createPose(input);
    expect(chain.insert).toHaveBeenCalledWith(input);
    expect(res).toEqual(row);
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("dup") });
    await expect(
      createPose({
        model_id: "m1",
        name: "x",
        description: null,
        source: "vendor_archive",
        reference_image_url: "u",
      }),
    ).rejects.toThrow("dup");
  });
});

describe("updatePose", () => {
  it("updates by id", async () => {
    const row = { id: "p1", is_active: false };
    chain.then = (resolve) => resolve({ data: row, error: null });
    const res = await updatePose({ id: "p1", patch: { is_active: false } });
    expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(res).toEqual(row);
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("nope") });
    await expect(updatePose({ id: "p1", patch: {} })).rejects.toThrow("nope");
  });
});

describe("deletePose", () => {
  it("deletes by id", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await deletePose("p1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("throws on error", async () => {
    chain.then = (resolve) => resolve({ error: new Error("fail") });
    await expect(deletePose("p1")).rejects.toThrow("fail");
  });
});

describe("setBackView", () => {
  it("clears the previous back-view pose first, then sets the new one, when value=true", async () => {
    chain.then = (resolve) => resolve({ data: { id: "p2", is_back_view: true }, error: null });
    await setBackView({ id: "p2", model_id: "m1", value: true });
    expect(chain.update).toHaveBeenNthCalledWith(1, { is_back_view: false });
    expect(chain.eq).toHaveBeenNthCalledWith(1, "model_id", "m1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "is_back_view", true);
    expect(chain.neq).toHaveBeenCalledWith("id", "p2");
    expect(chain.update).toHaveBeenNthCalledWith(2, { is_back_view: true });
  });

  it("does not clear anything when value=false, just unsets this pose", async () => {
    chain.then = (resolve) => resolve({ data: { id: "p2", is_back_view: false }, error: null });
    await setBackView({ id: "p2", model_id: "m1", value: false });
    expect(chain.update).toHaveBeenCalledTimes(1);
    expect(chain.update).toHaveBeenCalledWith({ is_back_view: false });
  });

  it("throws if the clear step errors", async () => {
    let call = 0;
    chain.then = (resolve) => {
      call++;
      return call === 1
        ? resolve({ error: new Error("clear fail") })
        : resolve({ data: null, error: null });
    };
    await expect(setBackView({ id: "p2", model_id: "m1", value: true })).rejects.toThrow(
      "clear fail",
    );
  });

  it("throws if the final update errors", async () => {
    chain.then = (resolve) => resolve({ data: null, error: new Error("final fail") });
    await expect(setBackView({ id: "p2", model_id: "m1", value: false })).rejects.toThrow(
      "final fail",
    );
  });
});
