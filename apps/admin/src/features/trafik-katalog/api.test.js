import { describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { rpc: (...a) => rpc(...a) } }));

import { fetchVisitStats } from "./api";

describe("fetchVisitStats", () => {
  it("memanggil RPC get_visit_stats dengan rentang tanggal", async () => {
    rpc.mockResolvedValue({ data: { sessions: 3 }, error: null });
    expect(await fetchVisitStats("2026-10-14", "2026-10-20")).toEqual({ sessions: 3 });
    expect(rpc).toHaveBeenCalledWith("get_visit_stats", {
      p_start: "2026-10-14",
      p_end: "2026-10-20",
    });
  });
  it("melempar error", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("x") });
    await expect(fetchVisitStats("2026-10-14", "2026-10-20")).rejects.toThrow("x");
  });
});
