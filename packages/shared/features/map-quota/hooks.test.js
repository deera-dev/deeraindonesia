import { describe, it, expect, beforeEach } from "vitest";
import { mapQuota, useMapQuotaStore, MAP_QUOTA_LIMITS } from "./hooks";

describe("mapQuota (public surface non-hook)", () => {
  beforeEach(() => {
    useMapQuotaStore.setState({
      date: "2026-10-04",
      counts: { geocoding: 0, directions: 0 },
    });
  });

  it("tryConsume() memanggil store tanpa perlu dipakai sbg hook di komponen React", () => {
    expect(mapQuota.tryConsume("geocoding")).toBe(true);
    expect(useMapQuotaStore.getState().counts.geocoding).toBe(1);
  });

  it("remaining() mencerminkan state store terkini", () => {
    mapQuota.tryConsume("directions");
    expect(mapQuota.remaining("directions")).toBe(MAP_QUOTA_LIMITS.directions - 1);
  });

  it("limit() mengembalikan batas harian yang dikonfigurasi per kind", () => {
    expect(mapQuota.limit("geocoding")).toBe(MAP_QUOTA_LIMITS.geocoding);
    expect(mapQuota.limit("directions")).toBe(MAP_QUOTA_LIMITS.directions);
  });

  it("limit() utk kind tak dikenal = Infinity", () => {
    expect(mapQuota.limit("entah-apa")).toBe(Infinity);
  });

  it("tryConsume() return false begitu limit tercapai", () => {
    useMapQuotaStore.setState({ counts: { geocoding: MAP_QUOTA_LIMITS.geocoding, directions: 0 } });
    expect(mapQuota.tryConsume("geocoding")).toBe(false);
  });
});
