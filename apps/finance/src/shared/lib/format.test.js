import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fmtRp, fmtTanggal, fmtTanggalPendek,
  getSabtu, getSenin,
  inputCls, labelCls, sectionTitleCls,
} from "./format";

describe("fmtRp", () => {
  it("formats number as Rp", () => {
    expect(fmtRp(50000)).toMatch(/50/);
  });
  it("returns dash for null", () => {
    expect(fmtRp(null)).toBe("—");
  });
  it("returns dash for empty string", () => {
    expect(fmtRp("")).toBe("—");
  });
  it("formats zero", () => {
    expect(fmtRp(0)).toMatch(/Rp/);
  });
});

describe("fmtTanggal", () => {
  it("returns dash for falsy", () => {
    expect(fmtTanggal(null)).toBe("—");
    expect(fmtTanggal("")).toBe("—");
  });
  it("returns formatted string for valid date", () => {
    const result = fmtTanggal("2026-07-04");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("fmtTanggalPendek", () => {
  it("returns dash for falsy", () => {
    expect(fmtTanggalPendek(null)).toBe("—");
    expect(fmtTanggalPendek("")).toBe("—");
  });
  it("returns formatted string for valid date", () => {
    const result = fmtTanggalPendek("2026-07-04");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getSabtu", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    expect(getSabtu()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("returns Saturday (day 6) for any input", () => {
    const result = getSabtu(new Date("2026-07-04")); // Saturday
    const d = new Date(result);
    expect(d.getDay()).toBe(6);
  });
  it("returns the next Saturday for a Sunday", () => {
    const result = getSabtu(new Date("2026-07-05")); // Sunday
    const d = new Date(result);
    expect(d.getDay()).toBe(6);
  });
  it("uses today if no arg", () => {
    const result = getSabtu();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getSenin", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    expect(getSenin()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("returns Monday (day 1) for any input", () => {
    const result = getSenin(new Date("2026-07-04")); // Saturday
    const d = new Date(result);
    expect(d.getDay()).toBe(1);
  });
  it("returns Monday for a Sunday input", () => {
    const result = getSenin(new Date("2026-07-05")); // Sunday → prev Monday
    const d = new Date(result);
    expect(d.getDay()).toBe(1);
  });
});

describe("CSS class constants", () => {
  it("inputCls is a non-empty string", () => {
    expect(typeof inputCls).toBe("string");
    expect(inputCls.length).toBeGreaterThan(0);
  });
  it("labelCls is a non-empty string", () => {
    expect(typeof labelCls).toBe("string");
    expect(labelCls.length).toBeGreaterThan(0);
  });
  it("sectionTitleCls is a non-empty string", () => {
    expect(typeof sectionTitleCls).toBe("string");
    expect(sectionTitleCls.length).toBeGreaterThan(0);
  });
});
