import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMapQuotaStore, MAP_QUOTA_LIMITS } from "./store";

function resetStore() {
  useMapQuotaStore.setState({
    date: "2026-10-04",
    counts: { geocoding: 0, directions: 0 },
  });
}

describe("useMapQuotaStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T08:00:00"));
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tryConsume bertambah 1 tiap dipanggil, return true selama belum mentok limit", () => {
    const ok1 = useMapQuotaStore.getState().tryConsume("geocoding");
    const ok2 = useMapQuotaStore.getState().tryConsume("geocoding");
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
    expect(useMapQuotaStore.getState().counts.geocoding).toBe(2);
  });

  it("tryConsume return false begitu limit kind tersebut tercapai, counter tidak lanjut bertambah", () => {
    useMapQuotaStore.setState({ counts: { geocoding: MAP_QUOTA_LIMITS.geocoding, directions: 0 } });
    const ok = useMapQuotaStore.getState().tryConsume("geocoding");
    expect(ok).toBe(false);
    expect(useMapQuotaStore.getState().counts.geocoding).toBe(MAP_QUOTA_LIMITS.geocoding);
  });

  it("counter geocoding dan directions independen satu sama lain", () => {
    useMapQuotaStore.getState().tryConsume("geocoding");
    useMapQuotaStore.getState().tryConsume("directions");
    useMapQuotaStore.getState().tryConsume("directions");
    expect(useMapQuotaStore.getState().counts).toEqual({ geocoding: 1, directions: 2 });
  });

  it("remaining mengembalikan sisa kuota harian yang benar", () => {
    useMapQuotaStore.getState().tryConsume("geocoding");
    useMapQuotaStore.getState().tryConsume("geocoding");
    expect(useMapQuotaStore.getState().remaining("geocoding")).toBe(MAP_QUOTA_LIMITS.geocoding - 2);
  });

  it("tryConsume(kind, amount) menghabiskan banyak jatah sekaligus & menolak kalau melewati limit", () => {
    expect(useMapQuotaStore.getState().tryConsume("routeMatrix", 8)).toBe(true);
    expect(useMapQuotaStore.getState().counts.routeMatrix).toBe(8);
    useMapQuotaStore.setState({ counts: { geocoding: 0, directions: 0, routeMatrix: MAP_QUOTA_LIMITS.routeMatrix - 3 } });
    expect(useMapQuotaStore.getState().tryConsume("routeMatrix", 8)).toBe(false);
    expect(useMapQuotaStore.getState().tryConsume("routeMatrix", 3)).toBe(true);
  });

  it("remaining tidak pernah negatif walau counts > limit", () => {
    useMapQuotaStore.setState({ counts: { geocoding: MAP_QUOTA_LIMITS.geocoding + 5, directions: 0 } });
    expect(useMapQuotaStore.getState().remaining("geocoding")).toBe(0);
  });

  it("counter otomatis reset ke 0 begitu tanggal sistem berganti hari", () => {
    useMapQuotaStore.getState().tryConsume("geocoding");
    useMapQuotaStore.getState().tryConsume("directions");
    expect(useMapQuotaStore.getState().counts).toEqual({ geocoding: 1, directions: 1 });

    vi.setSystemTime(new Date("2026-10-05T08:00:00"));

    // tryConsume dan remaining sama-sama trigger _resetIfNewDay()
    expect(useMapQuotaStore.getState().remaining("geocoding")).toBe(MAP_QUOTA_LIMITS.geocoding);
    expect(useMapQuotaStore.getState().counts).toEqual({ geocoding: 0, directions: 0 });
    expect(useMapQuotaStore.getState().date).toBe("2026-10-05");
  });

  it("kind yang tidak dikenal dianggap tanpa limit (Infinity)", () => {
    expect(useMapQuotaStore.getState().remaining("entah-apa")).toBe(Infinity);
    expect(useMapQuotaStore.getState().tryConsume("entah-apa")).toBe(true);
  });
});
