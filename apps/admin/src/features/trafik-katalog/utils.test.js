import { describe, it, expect } from "vitest";
import { channelLabel, channelColor, pct, dailyBars } from "./utils";

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
});
