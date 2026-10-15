import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { rpc: (...a) => rpc(...a) } }));
import { fetchMyNotifications, markNotificationsSeen } from "./api";

beforeEach(() => rpc.mockReset());

describe("notifikasi api", () => {
  it("fetchMyNotifications memanggil RPC dan mengembalikan data", async () => {
    rpc.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchMyNotifications(50)).toEqual([{ id: "1" }]);
    expect(rpc).toHaveBeenCalledWith("get_my_notifications", { p_limit: 50 });
  });
  it("fetchMyNotifications melempar error", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("x") });
    await expect(fetchMyNotifications()).rejects.toThrow("x");
  });
  it("markNotificationsSeen memanggil RPC", async () => {
    rpc.mockResolvedValue({ error: null });
    await markNotificationsSeen();
    expect(rpc).toHaveBeenCalledWith("mark_notifications_seen");
  });
});
