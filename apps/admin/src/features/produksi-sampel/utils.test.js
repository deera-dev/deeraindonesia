import { describe, it, expect } from "vitest";
import {
  fmtDate,
  STATUS_META,
  buildNomor,
  sortPlanningQueue,
  nextPlanningUrutan,
  buildReorderUpdates,
} from "./utils";

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
  it("has planning, draft, approved, ditahan, rejected keys", () => {
    expect(STATUS_META.planning).toBeDefined();
    expect(STATUS_META.draft).toBeDefined();
    expect(STATUS_META.approved).toBeDefined();
    expect(STATUS_META.ditahan).toBeDefined();
    expect(STATUS_META.rejected).toBeDefined();
  });
  it("planning label is Planning", () => {
    expect(STATUS_META.planning.label).toBe("Planning");
  });
  it("draft label is Menunggu Review (redesign Planning 2026-08)", () => {
    expect(STATUS_META.draft.label).toBe("Menunggu Review");
  });
  it("approved label is Approved", () => {
    expect(STATUS_META.approved.label).toBe("Approved");
  });
  it("ditahan label is Ditahan", () => {
    expect(STATUS_META.ditahan.label).toBe("Ditahan");
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

describe("sortPlanningQueue", () => {
  it("hanya menyertakan sampel status='planning'", () => {
    const sampels = [
      { id: "a", status: "planning", urutan: 0 },
      { id: "b", status: "draft", urutan: 0 },
      { id: "c", status: "planning", urutan: 1 },
    ];
    const result = sortPlanningQueue(sampels);
    expect(result.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("mengurutkan berdasarkan urutan ascending (0 = paling atas)", () => {
    const sampels = [
      { id: "a", status: "planning", urutan: 2 },
      { id: "b", status: "planning", urutan: 0 },
      { id: "c", status: "planning", urutan: 1 },
    ];
    const result = sortPlanningQueue(sampels);
    expect(result.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("urutan null/undefined ditaruh paling akhir, tiebreak created_at asc", () => {
    const sampels = [
      { id: "a", status: "planning", urutan: null, created_at: "2026-08-02" },
      { id: "b", status: "planning", urutan: 0 },
      { id: "c", status: "planning", urutan: undefined, created_at: "2026-08-01" },
    ];
    const result = sortPlanningQueue(sampels);
    expect(result.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("array kosong/null tidak error", () => {
    expect(sortPlanningQueue([])).toEqual([]);
    expect(sortPlanningQueue(null)).toEqual([]);
  });

  it("tidak memutasi array asli", () => {
    const sampels = [
      { id: "a", status: "planning", urutan: 1 },
      { id: "b", status: "planning", urutan: 0 },
    ];
    const original = [...sampels];
    sortPlanningQueue(sampels);
    expect(sampels).toEqual(original);
  });
});

describe("nextPlanningUrutan", () => {
  it("0 kalau belum ada planning sama sekali", () => {
    expect(nextPlanningUrutan([])).toBe(0);
    expect(nextPlanningUrutan([{ id: "a", status: "draft", urutan: 5 }])).toBe(0);
  });

  it("max(urutan) + 1 dari planning yang sudah ada (ditaruh paling bawah)", () => {
    const sampels = [
      { id: "a", status: "planning", urutan: 0 },
      { id: "b", status: "planning", urutan: 3 },
      { id: "c", status: "draft", urutan: 99 }, // bukan planning, diabaikan
    ];
    expect(nextPlanningUrutan(sampels)).toBe(4);
  });

  it("baris planning dengan urutan null dianggap -1 (tidak crash)", () => {
    const sampels = [{ id: "a", status: "planning", urutan: null }];
    expect(nextPlanningUrutan(sampels)).toBe(0);
  });
});

describe("buildReorderUpdates", () => {
  it("memetakan array id ke [{id, urutan}] sesuai index", () => {
    expect(buildReorderUpdates(["c", "a", "b"])).toEqual([
      { id: "c", urutan: 0 },
      { id: "a", urutan: 1 },
      { id: "b", urutan: 2 },
    ]);
  });
  it("array kosong/null -> []", () => {
    expect(buildReorderUpdates([])).toEqual([]);
    expect(buildReorderUpdates(null)).toEqual([]);
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
    expect(typeof b).toBe("string");
    expect(a).not.toBe(b);
  });
});
