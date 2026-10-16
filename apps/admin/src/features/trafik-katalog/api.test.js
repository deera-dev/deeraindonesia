import { describe, it, expect, vi } from "vitest";
const rpc = vi.fn();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { rpc: (...a) => rpc(...a) } }));
import { fetchVisitStats } from "./api";

describe("fetchVisitStats", () => {
  it("memanggil RPC get_visit_stats", async () => {
    rpc.mockResolvedValue({ data: { sessions: 3 }, error: null });
    expect(await fetchVisitStats(7)).toEqual({ sessions: 3 });
    expect(rpc).toHaveBeenCalledWith("get_visit_stats", { p_days: 7 });
  });
  it("melempar error", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("x") });
    await expect(fetchVisitStats()).rejects.toThrow("x");
  });
});
