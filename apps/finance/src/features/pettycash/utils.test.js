import { describe, it, expect } from "vitest";
import { PETTYCASH_KATEGORI_OPTIONS } from "./utils";

describe("PETTYCASH_KATEGORI_OPTIONS", () => {
  it("is an array", () => {
    expect(Array.isArray(PETTYCASH_KATEGORI_OPTIONS)).toBe(true);
  });
  it("has at least 3 items", () => {
    expect(PETTYCASH_KATEGORI_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });
  it("includes Konsumsi", () => {
    expect(PETTYCASH_KATEGORI_OPTIONS).toContain("Konsumsi");
  });
});
