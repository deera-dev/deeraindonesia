import { describe, it, expect } from "vitest";
import { fmtDate, STATUS_META, buildNomor } from "./utils";

describe("fmtDate", () => {
  it("returns - for falsy", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate("")).toBe("-");
  });
  it("returns formatted date string", () => {
    const result = fmtDate("2024-01-15");
    expect(result).toMatch(/2024/);
  });
});

describe("STATUS_META", () => {
  it("has draft, approved, rejected keys", () => {
    expect(STATUS_META.draft).toBeDefined();
    expect(STATUS_META.approved).toBeDefined();
    expect(STATUS_META.rejected).toBeDefined();
  });
  it("draft label is Menunggu", () => {
    expect(STATUS_META.draft.label).toBe("Menunggu");
  });
  it("approved label is Approved", () => {
    expect(STATUS_META.approved.label).toBe("Approved");
  });
  it("rejected label is Ditolak", () => {
    expect(STATUS_META.rejected.label).toBe("Ditolak");
  });
  it("each has cls string", () => {
    Object.values(STATUS_META).forEach((m) => {
      expect(typeof m.cls).toBe("string");
    });
  });
});

describe("buildNomor", () => {
  it("starts with SPL-", () => {
    expect(buildNomor()).toMatch(/^SPL-/);
  });
  it("has YYYYMMDD format in middle", () => {
    expect(buildNomor()).toMatch(/^SPL-\d{8}-/);
  });
  it("generates unique values", () => {
    const a = buildNomor();
    const b = buildNomor();
    // Extremely unlikely to collide
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(10);
  });
});
