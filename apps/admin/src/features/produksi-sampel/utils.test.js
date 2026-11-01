import { describe, it, expect } from "vitest";
import {
  buildWoNotes,
  isWoSelesai,
  filterByTab,
  referenceFotos,
  listAllWoFotos,
  buildPrintHtml,
  productFotos,
  repeatCandidates,
  buildRepeatPrefill,
  repeatFotoFor,
  fmtDate,
  STATUS_META,
  buildNomor,
  sortPlanningQueue,
  nextPlanningUrutan,
  buildReorderUpdates,
  sortWithPinnedFirst,
  buildTimeline,
  formatDisplayName,
  distinctBahan,
  filterByBahan,
  photoGridDims,
  WO_ZONA,
  MOTIF_OPTIONS,
  emptyZonaCatatan,
  zonaHasContent,
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
      { id: "c", status: "draft", urutan: 99 },
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

describe("buildTimeline", () => {
  it("memetakan history jadi array terurut by at asc", () => {
    const history = [
      { changed_at: "2026-08-01T10:00:00Z", action: "sampel-edit" },
      { changed_at: "2026-08-01T09:00:00Z", action: "sampel-buat" },
    ];
    const result = buildTimeline(history);
    expect(result).toEqual([
      { type: "history", at: "2026-08-01T09:00:00Z", raw: history[1] },
      { type: "history", at: "2026-08-01T10:00:00Z", raw: history[0] },
    ]);
  });

  it("array kosong/null tidak error", () => {
    expect(buildTimeline([])).toEqual([]);
    expect(buildTimeline(null)).toEqual([]);
    expect(buildTimeline(undefined)).toEqual([]);
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

describe("listAllWoFotos", () => {
  it("gabung foto final, model, bahan tanpa duplikat", () => {
    const r = listAllWoFotos({ foto: ["a"], model_foto: ["b", "a"], bahan_foto: "c" });
    expect(r).toEqual(["a", "b", "c"]);
  });
  it("selected diberi label dalam urutan yang diminta", () => {
    const r = buildWoNotes({}, { selected: ["x", "y"] });
    expect(r.refFotos).toEqual([{ label: "A", url: "x" }, { label: "B", url: "y" }]);
  });
});

describe("buildWoNotes", () => {
  it("poin-poin tanpa nama, bullet lama dibersihkan", () => {
    const r = buildWoNotes({ perubahan: "- kancing ke kiri\nlengan 2cm" });
    expect(r.text).toBe("- kancing ke kiri\n- lengan 2cm");
    expect(r.refFotos).toEqual([]);
  });

  it("excludeUrls (foto yang sudah tercetak) tidak jadi referensi; maksimal maxRefs", () => {
    const r = buildWoNotes({}, { selected: ["u1", "u2", "u3"], excludeUrls: ["u1"], maxRefs: 1 });
    expect(r.refFotos).toHaveLength(1);
    expect(r.refFotos).toEqual([{ label: "A", url: "u2" }]);
  });

  it("kosong -> teks kosong", () => {
    expect(buildWoNotes(null)).toEqual({ text: "", refFotos: [] });
  });
});

describe("Planning Repeat utils (acuan = produk jadi)", () => {
  const prod = { id: "p1", kode: "D-07-OSK", nama: "Gamis Arkana", image: "main.jpg", detail: ["d1", "d2", "d3"] };

  it("productFotos: image + detail, buang yang kosong", () => {
    expect(productFotos(prod)).toEqual(["main.jpg", "d1", "d2", "d3"]);
    expect(productFotos({ image: null, detail: null })).toEqual([]);
  });

  it("repeatCandidates: hanya produk ber-foto utama", () => {
    expect(repeatCandidates([prod, { ...prod, id: "x", image: null }]).map((p) => p.id)).toEqual(["p1"]);
    expect(repeatCandidates(null)).toEqual([]);
  });

  it("buildRepeatPrefill: nama = Repeat + KODE (tanpa nama produk; fallback nama kalau kode kosong), model maks 3, ref berisi id & kode", () => {
    const r = buildRepeatPrefill(prod);
    expect(r).toMatchObject({ nama: "Repeat D-07-OSK", repeat: { id: "p1", kode: "D-07-OSK" } });
    expect(r.modelFotos).toEqual(["main.jpg", "d1", "d2"]);
    expect(buildRepeatPrefill({ ...prod, kode: null, nama: "Repeat Gamis Arkana" }).nama).toBe("Repeat Gamis Arkana");
  });

  it("repeatFotoFor: foto produk acuan (by id/kode); fallback model_foto kalau produk hilang", () => {
    expect(repeatFotoFor({ repeat_dari_id: "p1", model_foto: ["m"] }, [prod])).toEqual(["main.jpg", "d1", "d2", "d3"]);
    expect(repeatFotoFor({ repeat_dari_kode: "D-07-OSK", model_foto: ["m"] }, [prod])[0]).toBe("main.jpg");
    expect(repeatFotoFor({ repeat_dari_id: "x", model_foto: ["m"] }, [prod])).toEqual(["m"]);
  });
});

describe("buildPrintHtml (cetak A4)", () => {
  it("halaman A4 tanpa margin, gambar memenuhi 210x297mm", () => {
    const html = buildPrintHtml("data:image/png;base64,AAA");
    expect(html).toContain("@page{size:A4 portrait;margin:0}");
    expect(html).toContain("width:210mm;height:297mm");
    expect(html).toContain('src="data:image/png;base64,AAA"');
  });
});

describe("tab Selesai (WO selesai disembunyikan dari tab lain)", () => {
  const list = [
    { id: 1, status: "planning" },
    { id: 2, status: "approved", wo_selesai_at: null },
    { id: 3, status: "approved", wo_selesai_at: "2026-10-14T00:00:00Z" },
    { id: 4, status: "draft", wo_selesai_at: "2026-10-14T00:00:00Z" },
  ];
  it("isWoSelesai hanya untuk approved yang punya wo_selesai_at", () => {
    expect(list.map(isWoSelesai)).toEqual([false, false, true, false]);
  });
  it("Semua & Disetujui menyembunyikan yang selesai; Selesai menampilkannya", () => {
    expect(filterByTab(list, "all").map((s) => s.id)).toEqual([1, 2, 4]);
    expect(filterByTab(list, "approved").map((s) => s.id)).toEqual([2]);
    expect(filterByTab(list, "selesai").map((s) => s.id)).toEqual([3]);
    expect(filterByTab(list, "planning").map((s) => s.id)).toEqual([1]);
  });
  it("referenceFotos mengambil foto bahan (termasuk fallback bahan_foto) + model", () => {
    expect(
      referenceFotos({ bahan_items: [{ foto: "a" }, { foto: null }], bahan_foto: "legacy", model_foto: ["m1", "m2"] }),
    ).toEqual({ bahan: ["a"], model: ["m1", "m2"] });
    expect(referenceFotos({ bahan_foto: "legacy", model_foto: [] })).toEqual({ bahan: ["legacy"], model: [] });
  });
});

describe("distinctBahan / filterByBahan", () => {
  const list = [
    { id: 1, bahan_items: [{ nama_bahan: "Katun" }, { nama_bahan: "Satin" }] },
    { id: 2, bahan_items: [{ nama_bahan: " Katun " }] },
    { id: 3, bahan_items: [] },
    { id: 4 },
  ];
  it("daftar bahan unik terurut, kosong/trim diabaikan", () => {
    expect(distinctBahan(list)).toEqual(["Katun", "Satin"]);
    expect(distinctBahan(undefined)).toEqual([]);
  });
  it("filterByBahan: kosong = semua; terpilih = yang memakai bahan itu", () => {
    expect(filterByBahan(list, "")).toBe(list);
    expect(filterByBahan(list, "Satin").map((x) => x.id)).toEqual([1]);
    expect(filterByBahan(list, "Katun").map((x) => x.id)).toEqual([1, 2]);
  });
});

describe("cetak halaman foto A4", () => {
  it("photoGridDims menyesuaikan jumlah foto", () => {
    expect(photoGridDims(1)).toEqual({ cols: 1, rows: 1 });
    expect(photoGridDims(2)).toEqual({ cols: 1, rows: 2 });
    expect(photoGridDims(4)).toEqual({ cols: 2, rows: 2 });
    expect(photoGridDims(6)).toEqual({ cols: 2, rows: 3 });
  });
  it("buildPrintHtml mendukung 2 halaman (WO + foto)", () => {
    const html = buildPrintHtml(["data:a", "data:b"]);
    expect(html).toContain('src="data:a"');
    expect(html).toContain('src="data:b"');
    expect(html).toContain("page-break-after:always");
  });
});

describe("filterByTab — WO Sampel memindahkan planning ke step Sampel", () => {
  const list = [
    { id: "a", status: "planning" },
    { id: "b", status: "planning", wo_sampel_at: "2026-10-17" },
    { id: "c", status: "draft" },
    { id: "d", status: "approved" },
  ];
  it("planning = belum WO Sampel; draft = sudah dijahit + sedang dibuat", () => {
    expect(filterByTab(list, "planning").map((s) => s.id)).toEqual(["a"]);
    expect(filterByTab(list, "draft").map((s) => s.id)).toEqual(["b", "c"]);
    expect(filterByTab(list, "all").map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("WO_ZONA — checklist per-bagian WO (Denny 2026-11: urutan cara cek model patokan)", () => {
  it("7 zona sesuai urutan kerja tukang potong: dada, bawah, lengan, tangan depan, samping, belakang, pundak", () => {
    expect(WO_ZONA.map((z) => z.key)).toEqual([
      "dada",
      "bawah",
      "lengan",
      "tangan_depan",
      "samping",
      "belakang",
      "pundak",
    ]);
  });
});

describe("MOTIF_OPTIONS", () => {
  it("2 opsi: motif dan polos", () => {
    expect(MOTIF_OPTIONS.map((m) => m.key)).toEqual(["motif", "polos"]);
  });
});

describe("emptyZonaCatatan", () => {
  it("mengembalikan object dengan 7 key WO_ZONA, masing-masing {catatan: '', crop: null, motif: null}", () => {
    const zona = emptyZonaCatatan();
    expect(Object.keys(zona)).toEqual(WO_ZONA.map((z) => z.key));
    for (const z of WO_ZONA) {
      expect(zona[z.key]).toEqual({ catatan: "", crop: null, motif: null });
    }
  });
});

describe("zonaHasContent", () => {
  it("false untuk zona kosong (hasil emptyZonaCatatan)", () => {
    expect(zonaHasContent(emptyZonaCatatan())).toBe(false);
  });

  it("false untuk null/undefined", () => {
    expect(zonaHasContent(null)).toBe(false);
    expect(zonaHasContent(undefined)).toBe(false);
  });

  it("false kalau catatan cuma whitespace dan crop null", () => {
    const zona = emptyZonaCatatan();
    zona.dada.catatan = "   ";
    expect(zonaHasContent(zona)).toBe(false);
  });

  it("true kalau salah satu zona punya catatan terisi", () => {
    const zona = emptyZonaCatatan();
    zona.lengan.catatan = "manset kancing 2, polos";
    expect(zonaHasContent(zona)).toBe(true);
  });

  it("true kalau salah satu zona punya crop walau catatan kosong", () => {
    const zona = emptyZonaCatatan();
    zona.belakang.crop = { url: "https://cloud/ref.jpg", x: 0.1, y: 0.1, width: 0.3, height: 0.3 };
    expect(zonaHasContent(zona)).toBe(true);
  });

  it("true kalau salah satu zona punya motif terpilih walau catatan & crop kosong", () => {
    const zona = emptyZonaCatatan();
    zona.dada.motif = "polos";
    expect(zonaHasContent(zona)).toBe(true);
  });
});
