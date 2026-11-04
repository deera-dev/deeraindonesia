import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackVisit } from "./api";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("trackVisit", () => {
  it("POST ke /api/track dengan payload apa adanya (Edge Function yang urus p_ prefix & geo)", async () => {
    fetch.mockResolvedValue({ ok: true, status: 204 });
    const payload = { visitor: "v", session: "s", path: "/code/D-1", referrer: "https://google.com/", isLanding: true, src: "qr" };
    await trackVisit(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/track",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }),
    );
  });

  it("meneruskan tripId/tokoId/link/internal apa adanya di body", async () => {
    fetch.mockResolvedValue({ ok: true, status: 204 });
    const payload = { visitor: "v", session: "s", path: "/catalog", isLanding: true, src: "ngorder", tripId: "t1", tokoId: "k1", link: "ab12cd", internal: true };
    await trackVisit(payload);
    const sentBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sentBody).toMatchObject({ tripId: "t1", tokoId: "k1", link: "ab12cd", internal: true });
  });

  it("melempar error kalau response tidak ok", async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(trackVisit({ visitor: "v", session: "s", path: "/" })).rejects.toThrow("500");
  });
});
