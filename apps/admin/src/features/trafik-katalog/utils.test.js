import { describe, it, expect } from "vitest";
import { channelLabel, channelColor, pct, dailyBars, sourceLabel, locationLabel, fmtDay, localDateStr, rangeForPreset, clampRange } from "./utils";

describe("trafik utils", () => {
  it("label & warna dengan fallback", () => {
    expect(channelLabel("ai")).toContain("AI");
    expect(channelLabel("xyz")).toBe("xyz");
    expect(channelColor("xyz")).toBe("#94A3B8");
  });
  it("pct aman terhadap total 0", () => {
    expect(pct(1, 0)).toBe(0);
    expect(pct(1, 4)).toBe(25);
  });
  it("dailyBars menormalkan tinggi", () => {
    const b = dailyBars([{ date: "a", sessions: 10 }, { date: "b", sessions: 5 }, { date: "c", sessions: 0 }]);
    expect(b.map((x) => x.h)).toEqual([100, 50, 4]);
  });
  it("sourceLabel mengganti 'qr' dengan label saluran", () => {
    expect(sourceLabel({ source: "qr", channel: "qr_produk" })).toBe("Scan QR produk");
    expect(sourceLabel({ source: "l.instagram.com", channel: "instagram" })).toBe("l.instagram.com");
  });
  it("fmtDay", () => {
    expect(fmtDay("2026-10-16")).toBe("16 Okt");
    expect(fmtDay(null)).toBe("");
  });
  it("localDateStr format YYYY-MM-DD lokal", () => {
    expect(localDateStr(new Date(2026, 9, 20))).toBe("2026-10-20");
  });
  it("rangeForPreset: today start=end hari ini", () => {
    expect(rangeForPreset("today", "2026-10-20")).toEqual({ start: "2026-10-20", end: "2026-10-20" });
  });
  it("rangeForPreset: N hari mundur dari hari ini", () => {
    expect(rangeForPreset(7, "2026-10-20")).toEqual({ start: "2026-10-14", end: "2026-10-20" });
    expect(rangeForPreset(30, "2026-10-20")).toEqual({ start: "2026-09-21", end: "2026-10-20" });
  });
  it("clampRange menukar start/end terbalik dan membatasi end ke hari ini", () => {
    expect(clampRange({ start: "2026-10-20", end: "2026-10-14" }, "2026-10-20")).toEqual({ start: "2026-10-14", end: "2026-10-20" });
    expect(clampRange({ start: "2026-10-14", end: "2026-10-25" }, "2026-10-20")).toEqual({ start: "2026-10-14", end: "2026-10-20" });
  });
  it("clampRange fallback ke hari ini kalau kosong", () => {
    expect(clampRange({}, "2026-10-20")).toEqual({ start: "2026-10-20", end: "2026-10-20" });
  });

  describe("locationLabel (Denny: 'saya juga mau di halaman trafik bisa terlihat lokasinya')", () => {
    it("gabung kota + provinsi dengan koma", () => {
      expect(locationLabel({ city: "Jakarta Selatan", region: "DKI Jakarta", country: "ID" })).toBe("Jakarta Selatan, DKI Jakarta");
    });
    it("kota saja kalau provinsi kosong/sama dengan kota", () => {
      expect(locationLabel({ city: "Jakarta", region: null, country: "ID" })).toBe("Jakarta");
      expect(locationLabel({ city: "Jakarta", region: "Jakarta", country: "ID" })).toBe("Jakarta");
    });
    it("tidak tampilkan kode negara kalau ID (domestik, default)", () => {
      expect(locationLabel({ city: "Bandung", region: "Jawa Barat", country: "ID" })).not.toContain("(ID)");
    });
    it("tampilkan kode negara kalau bukan ID", () => {
      expect(locationLabel({ city: "Singapore", region: null, country: "SG" })).toBe("Singapore (SG)");
    });
    it("fallback 'Tidak diketahui' kalau city kosong", () => {
      expect(locationLabel({ city: null, region: null, country: null })).toBe("Tidak diketahui");
      expect(locationLabel(null)).toBe("Tidak diketahui");
    });
  });
});
