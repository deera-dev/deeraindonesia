import { describe, it, expect, vi } from "vitest";
const rpc = vi.fn();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { rpc: (...a) => rpc(...a) } }));
import { trackVisit } from "./api";

describe("trackVisit", () => {
  it("memanggil RPC track_visit dengan parameter ber-prefix p_", async () => {
    rpc.mockResolvedValue({ error: null });
    await trackVisit({ visitor: "v", session: "s", path: "/code/D-1", referrer: "https://google.com/", isLanding: true, src: "qr" });
    expect(rpc).toHaveBeenCalledWith("track_visit", expect.objectContaining({ p_visitor: "v", p_path: "/code/D-1", p_src: "qr", p_is_landing: true, p_trip_id: null, p_toko_id: null }));
  });
  it("meneruskan trip_id & toko_id (link ngorder)", async () => {
    rpc.mockResolvedValue({ error: null });
    await trackVisit({ visitor: "v", session: "s", path: "/catalog", isLanding: true, src: "ngorder", tripId: "t1", tokoId: "k1" });
    expect(rpc).toHaveBeenCalledWith("track_visit", expect.objectContaining({ p_trip_id: "t1", p_toko_id: "k1" }));
  });
  it("melempar error dari Supabase", async () => {
    rpc.mockResolvedValue({ error: new Error("x") });
    await expect(trackVisit({ visitor: "v", session: "s", path: "/" })).rejects.toThrow("x");
  });
});
