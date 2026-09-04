import { describe, it, expect } from "vitest";
import {
  fmtDate,
  STATUS_META,
  buildNomor,
  sortPlanningQueue,
  nextPlanningUrutan,
  buildReorderUpdates,
  sortWithPinnedFirst,
  canDeleteComment,
  splitMentionSegments,
  buildTimeline,
  formatDisplayName,
  ALL_MENTION,
  buildMentionProfiles,
  computeUnreadCounts,
  sumUnreadCounts,
  buildReadByNames,
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
  it("planning label is 'Belum Dibuat' (permintaan Denny 2026-09: wording diperjelas)", () => {
    expect(STATUS_META.planning.label).toBe("Belum Dibuat");
  });
  it("draft label is 'Menunggu Approval' (permintaan Denny 2026-09: wording diperjelas)", () => {
    expect(STATUS_META.draft.label).toBe("Menunggu Approval");
  });
  it("approved label is 'Disetujui' (permintaan Denny 2026-09: wording diperjelas)", () => {
    expect(STATUS_META.approved.label).toBe("Disetujui");
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

describe("sortWithPinnedFirst", () => {
  it("menaruh item pinned=true di depan", () => {
    const sampels = [
      { id: "a", pinned: false },
      { id: "b", pinned: true },
      { id: "c", pinned: false },
    ];
    const result = sortWithPinnedFirst(sampels);
    expect(result.map((s) => s.id)).toEqual(["b", "a", "c"]);
  });

  it("stabil (tidak mengacak urutan relatif dalam grup yang sama)", () => {
    const sampels = [
      { id: "a", pinned: true },
      { id: "b", pinned: true },
      { id: "c", pinned: false },
      { id: "d", pinned: false },
    ];
    const result = sortWithPinnedFirst(sampels);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("tidak memutasi array asli", () => {
    const sampels = [{ id: "a", pinned: false }, { id: "b", pinned: true }];
    const original = [...sampels];
    sortWithPinnedFirst(sampels);
    expect(sampels).toEqual(original);
  });

  it("array kosong/null tidak error", () => {
    expect(sortWithPinnedFirst([])).toEqual([]);
    expect(sortWithPinnedFirst(null)).toEqual([]);
  });
});

describe("canDeleteComment", () => {
  it("true kalau user_email sama dengan currentUserEmail", () => {
    expect(canDeleteComment({ user_email: "a@b.com" }, "a@b.com")).toBe(true);
  });
  it("false kalau user_email beda", () => {
    expect(canDeleteComment({ user_email: "a@b.com" }, "x@y.com")).toBe(false);
  });
  it("false kalau salah satu kosong", () => {
    expect(canDeleteComment({ user_email: "" }, "a@b.com")).toBe(false);
    expect(canDeleteComment({ user_email: "a@b.com" }, "")).toBe(false);
    expect(canDeleteComment(null, "a@b.com")).toBe(false);
  });
});

describe("splitMentionSegments", () => {
  const profiles = [{ full_name: "Budi" }, { full_name: "Budi Santoso" }];

  it("mengembalikan array kosong kalau text kosong", () => {
    expect(splitMentionSegments("", profiles)).toEqual([]);
    expect(splitMentionSegments(null, profiles)).toEqual([]);
  });

  it("mengembalikan satu segmen non-mention kalau tidak ada profil", () => {
    expect(splitMentionSegments("halo dunia", [])).toEqual([{ text: "halo dunia", isMention: false }]);
  });

  it("mendeteksi mention nama tunggal", () => {
    const result = splitMentionSegments("halo @Budi apa kabar", [{ full_name: "Budi" }]);
    expect(result).toEqual([
      { text: "halo ", isMention: false },
      { text: "@Budi", isMention: true },
      { text: " apa kabar", isMention: false },
    ]);
  });

  it("nama lebih panjang tidak ke-cut oleh prefix nama lain", () => {
    const result = splitMentionSegments("cc @Budi Santoso ya", profiles);
    expect(result).toEqual([
      { text: "cc ", isMention: false },
      { text: "@Budi Santoso", isMention: true },
      { text: " ya", isMention: false },
    ]);
  });

  it("tidak mendeteksi apapun kalau tidak ada @mention yang cocok", () => {
    const result = splitMentionSegments("tidak ada mention di sini", profiles);
    expect(result).toEqual([{ text: "tidak ada mention di sini", isMention: false }]);
  });
});

describe("buildTimeline", () => {
  it("menggabungkan history & comments jadi satu array terurut by at asc", () => {
    const history = [{ changed_at: "2026-08-01T10:00:00Z", action: "sampel-edit" }];
    const comments = [{ created_at: "2026-08-01T09:00:00Z", text: "halo" }];
    const result = buildTimeline(history, comments);
    expect(result).toEqual([
      { type: "comment", at: "2026-08-01T09:00:00Z", raw: comments[0] },
      { type: "history", at: "2026-08-01T10:00:00Z", raw: history[0] },
    ]);
  });

  it("array kosong/null tidak error", () => {
    expect(buildTimeline([], [])).toEqual([]);
    expect(buildTimeline(null, null)).toEqual([]);
    expect(buildTimeline(undefined, undefined)).toEqual([]);
  });
});

describe("formatDisplayName (permintaan Denny 2026-09: capitalize, tanpa domain)", () => {
  it("email dengan domain -> Title Case tanpa domain", () => {
    expect(formatDisplayName("denny@deera.id")).toBe("Denny");
  });

  it("email dgn nama majemuk (titik/underscore) -> tiap kata di-capitalize", () => {
    expect(formatDisplayName("budi.santoso@deera.id")).toBe("Budi Santoso");
    expect(formatDisplayName("budi_santoso@deera.id")).toBe("Budi Santoso");
  });

  it("nama tanpa @ tetap di-Title-Case-kan (idempotent utk full_name yg sudah rapi)", () => {
    expect(formatDisplayName("Citra")).toBe("Citra");
    expect(formatDisplayName("BUDI SANTOSO")).toBe("Budi Santoso");
  });

  it("string kosong/null/undefined -> string kosong", () => {
    expect(formatDisplayName("")).toBe("");
    expect(formatDisplayName(null)).toBe("");
    expect(formatDisplayName(undefined)).toBe("");
  });
});

describe("ALL_MENTION & buildMentionProfiles (permintaan Denny 2026-09: mention @all)", () => {
  it("ALL_MENTION punya email '*' dan full_name 'All'", () => {
    expect(ALL_MENTION.email).toBe("*");
    expect(ALL_MENTION.full_name).toBe("All");
  });

  it("buildMentionProfiles menaruh ALL_MENTION di paling atas", () => {
    const result = buildMentionProfiles([{ id: "u1", email: "budi@deera.id", full_name: "budi" }]);
    expect(result[0]).toEqual(ALL_MENTION);
  });

  it("buildMentionProfiles memformat full_name profil asli (Title Case, no domain)", () => {
    const result = buildMentionProfiles([{ id: "u1", email: "budi@deera.id", full_name: "budi" }]);
    expect(result[1]).toEqual({ id: "u1", email: "budi@deera.id", full_name: "Budi" });
  });

  it("buildMentionProfiles fallback ke email kalau full_name kosong", () => {
    const result = buildMentionProfiles([{ id: "u1", email: "budi@deera.id", full_name: "" }]);
    expect(result[1].full_name).toBe("budi@deera.id");
  });

  it("array kosong/null tetap menghasilkan [ALL_MENTION]", () => {
    expect(buildMentionProfiles([])).toEqual([ALL_MENTION]);
    expect(buildMentionProfiles(null)).toEqual([ALL_MENTION]);
  });
});

describe("computeUnreadCounts (permintaan Denny 2026-09: badge unread Diskusi)", () => {
  const meta = [
    { id: "c1", sampel_id: "s1", created_at: "2026-09-01T10:00:00Z", user_email: "a@deera.id" },
    { id: "c2", sampel_id: "s1", created_at: "2026-09-01T11:00:00Z", user_email: "b@deera.id" },
    { id: "c3", sampel_id: "s2", created_at: "2026-09-01T09:00:00Z", user_email: "b@deera.id" },
  ];

  it("menghitung komentar org LAIN yang created_at > last_read_at", () => {
    const reads = [{ sampel_id: "s1", last_read_at: "2026-09-01T10:30:00Z" }];
    const result = computeUnreadCounts(meta, reads, "a@deera.id");
    // s1: cuma c2 (11:00) yang > 10:30 dan bukan dari "a" sendiri
    expect(result).toEqual({ s1: 1, s2: 1 });
  });

  it("belum pernah baca sama sekali (tidak ada baris reads) -> semua komentar org lain dihitung", () => {
    const result = computeUnreadCounts(meta, [], "a@deera.id");
    expect(result).toEqual({ s1: 1, s2: 1 }); // c1 milik "a" sendiri, tidak dihitung
  });

  it("komentar milik diri sendiri TIDAK dihitung sbg unread", () => {
    const result = computeUnreadCounts(meta, [], "b@deera.id");
    // c2 & c3 milik "b" sendiri -> diabaikan; c1 milik "a" -> unread utk "b"
    expect(result).toEqual({ s1: 1 });
  });

  it("sudah baca semua (last_read_at >= komentar terbaru) -> tidak ada unread", () => {
    const reads = [
      { sampel_id: "s1", last_read_at: "2026-09-02T00:00:00Z" },
      { sampel_id: "s2", last_read_at: "2026-09-02T00:00:00Z" },
    ];
    expect(computeUnreadCounts(meta, reads, "a@deera.id")).toEqual({});
  });

  it("array kosong/null tidak error", () => {
    expect(computeUnreadCounts([], [], "a@deera.id")).toEqual({});
    expect(computeUnreadCounts(null, null, "a@deera.id")).toEqual({});
  });
});

describe("sumUnreadCounts (permintaan Denny 2026-09: badge di item nav Produksi, bukan cuma di Catatan/Diskusi)", () => {
  it("menjumlahkan semua nilai di map jadi satu angka", () => {
    expect(sumUnreadCounts({ s1: 2, s2: 3, s3: 1 })).toBe(6);
  });

  it("0 kalau map kosong/null/undefined", () => {
    expect(sumUnreadCounts({})).toBe(0);
    expect(sumUnreadCounts(null)).toBe(0);
    expect(sumUnreadCounts(undefined)).toBe(0);
  });
});

describe("buildReadByNames (permintaan Denny 2026-09: siapa saja sudah membaca)", () => {
  const reads = [
    { user_email: "a@deera.id", user_name: "budi", last_read_at: "2026-09-01T12:00:00Z" },
    { user_email: "b@deera.id", user_name: "citra", last_read_at: "2026-09-01T08:00:00Z" },
  ];

  it("hanya user yang last_read_at >= waktu komentar terakhir", () => {
    const result = buildReadByNames(reads, "2026-09-01T10:00:00Z", null);
    expect(result).toEqual(["Budi"]);
  });

  it("mengecualikan excludeEmail (diri sendiri)", () => {
    const result = buildReadByNames(reads, "2026-09-01T00:00:00Z", "a@deera.id");
    expect(result).toEqual(["Citra"]);
  });

  it("[] kalau belum ada komentar sama sekali (lastCommentAt falsy)", () => {
    expect(buildReadByNames(reads, null, null)).toEqual([]);
    expect(buildReadByNames(reads, undefined, null)).toEqual([]);
  });

  it("array kosong/null tidak error", () => {
    expect(buildReadByNames([], "2026-09-01T00:00:00Z", null)).toEqual([]);
    expect(buildReadByNames(null, "2026-09-01T00:00:00Z", null)).toEqual([]);
  });

  // excludeEmails berupa ARRAY (permintaan Denny 2026-09: indikator per-pesan
  // — exclude viewer saat ini SEKALIGUS penulis pesan itu sendiri).
  it("excludeEmails berupa array mengecualikan lebih dari satu email sekaligus", () => {
    const result = buildReadByNames(reads, "2026-09-01T00:00:00Z", ["a@deera.id", "b@deera.id"]);
    expect(result).toEqual([]);
  });

  it("excludeEmails array hanya mengecualikan yang disebut, sisanya tetap tampil", () => {
    const threeReads = [
      ...reads,
      { user_email: "c@deera.id", user_name: "dedi", last_read_at: "2026-09-01T09:00:00Z" },
    ];
    // exclude "a" (viewer) & "b" (penulis pesan) — "c" tetap tampil
    const result = buildReadByNames(threeReads, "2026-09-01T00:00:00Z", ["a@deera.id", "b@deera.id"]);
    expect(result).toEqual(["Dedi"]);
  });

  it("excludeEmails array kosong tidak mengecualikan siapapun", () => {
    const result = buildReadByNames(reads, "2026-09-01T00:00:00Z", []);
    expect(result).toEqual(["Budi", "Citra"]);
  });
});
