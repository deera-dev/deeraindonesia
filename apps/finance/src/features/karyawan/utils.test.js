import { describe, it, expect } from "vitest";
import { TIM_OPTIONS, timLabel } from "./utils";

describe("TIM_OPTIONS", () => {
  it("has 6 items", () => {
    expect(TIM_OPTIONS.length).toBe(6);
  });
  it("includes potong and jahit", () => {
    const values = TIM_OPTIONS.map((t) => t.value);
    expect(values).toContain("potong");
    expect(values).toContain("jahit");
  });
});

describe("timLabel", () => {
  it("returns label for known value", () => {
    expect(timLabel("potong")).toBe("Tim Potong");
    expect(timLabel("jahit")).toBe("Tim Jahit");
    expect(timLabel("kreatif")).toBe("Tim Kreatif");
  });
  it("returns value itself for unknown", () => {
    expect(timLabel("foo")).toBe("foo");
  });
  it("returns dash for null/undefined", () => {
    expect(timLabel(null)).toBe("—");
    expect(timLabel(undefined)).toBe("—");
  });
});
