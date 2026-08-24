import { describe, it, expect } from "vitest";
import {
  totalStok,
  otherMarket,
  restockTarget,
  restockNeeded,
  isMenipis,
  isHampirHabis,
  isTidakBergerak,
  buildRestockList,
  buildTidakBergerakList,
  getDefaultTargetMarket,
  marketLabel,
  TARGET_SERI_QTY,
} from "./utils";

describe("totalStok", () => {
  it("sums gudang + cideng + tegalgubug", () => {
    expect(totalStok({ gudang: 5, cideng: 2, tegalgubug: 1 })).toBe(8);
  });
  it("treats missing fields as 0", () => {
    expect(totalStok({ gudang: 5 })).toBe(5);
  });
});

describe("otherMarket", () => {
  it("cideng -> tegalgubug", () => {
    expect(otherMarket("cideng")).toBe("tegalgubug");
  });
  it("tegalgubug -> cideng", () => {
    expect(otherMarket("tegalgubug")).toBe("cideng");
  });
  it("gudang/unknown -> null", () => {
    expect(otherMarket("gudang")).toBeNull();
    expect(otherMarket(null)).toBeNull();
  });
});

// ── Aturan baru 2026-08: target 3 pcs/warna di pasar (bukan rasio) ──────────
describe("restockTarget", () => {
  it("normalnya TARGET_SERI_QTY (3) kalau total stok sistem cukup", () => {
    expect(restockTarget({ gudang: 15, cideng: 1, tegalgubug: 4 })).toBe(TARGET_SERI_QTY);
  });
  it("turun jadi total stok sistem kalau total < 3 (barang mau habis)", () => {
    expect(restockTarget({ gudang: 1, cideng: 0, tegalgubug: 1 })).toBe(2);
    expect(restockTarget({ gudang: 0, cideng: 0, tegalgubug: 0 })).toBe(0);
  });
});

describe("restockNeeded", () => {
  it("selisih target - marketQty, tidak pernah negatif", () => {
    // total 20, target 3, cideng 1 -> butuh 2
    expect(restockNeeded({ gudang: 15, cideng: 1, tegalgubug: 4 }, "cideng")).toBe(2);
    // sudah >= target -> 0
    expect(restockNeeded({ gudang: 5, cideng: 5, tegalgubug: 0 }, "cideng")).toBe(0);
  });
  it("0 kalau market kosong", () => {
    expect(restockNeeded({ gudang: 10, cideng: 0, tegalgubug: 0 }, null)).toBe(0);
  });
  it("kasus hampir habis: total 2, cideng 0 -> butuh 2 (bawa semua yang ada)", () => {
    expect(restockNeeded({ gudang: 1, cideng: 0, tegalgubug: 1 }, "cideng")).toBe(2);
  });
});

describe("isMenipis", () => {
  it("true kalau marketQty di bawah target dan masih ada stok lain buat dibawa", () => {
    const row = { gudang: 15, cideng: 1, tegalgubug: 4 };
    expect(isMenipis(row, "cideng")).toBe(true);
  });

  it("false kalau marketQty sudah >= target 3, walau total stok masih banyak di lokasi lain", () => {
    const row = { gudang: 4, cideng: 3, tegalgubug: 1 }; // cideng sudah 3 = target
    expect(isMenipis(row, "cideng")).toBe(false);
  });

  it("false kalau total stok 0", () => {
    expect(isMenipis({ gudang: 0, cideng: 0, tegalgubug: 0 }, "cideng")).toBe(false);
  });

  it("false kalau tidak ada stok di lokasi lain (semua stok memang sudah di pasar ini)", () => {
    const row = { gudang: 0, cideng: 3, tegalgubug: 0 }; // marketQty == total == target
    expect(isMenipis(row, "cideng")).toBe(false);
  });

  it("true (hampir habis) kalau total sistem < 3 dan belum semua di pasar ini", () => {
    const row = { gudang: 1, cideng: 0, tegalgubug: 1 }; // total 2 < 3
    expect(isMenipis(row, "cideng")).toBe(true);
  });

  it("false kalau market kosong", () => {
    expect(isMenipis({ gudang: 10, cideng: 0, tegalgubug: 0 }, null)).toBe(false);
  });
});

describe("isHampirHabis", () => {
  it("true kalau total stok sistem < TARGET_SERI_QTY", () => {
    expect(isHampirHabis({ gudang: 1, cideng: 1, tegalgubug: 0 })).toBe(true);
  });
  it("false kalau total stok sistem >= TARGET_SERI_QTY", () => {
    expect(isHampirHabis({ gudang: 1, cideng: 1, tegalgubug: 1 })).toBe(false);
  });
});

describe("isTidakBergerak", () => {
  it("true kalau ada stok di pasar & kode tidak ada di soldSet", () => {
    const row = { kode: "D-01-OSK", cideng: 3 };
    expect(isTidakBergerak(row, "cideng", new Set(["D-99-XXX"]))).toBe(true);
  });
  it("false kalau kode ada di soldSet (laku)", () => {
    const row = { kode: "D-01-OSK", cideng: 3 };
    expect(isTidakBergerak(row, "cideng", new Set(["D-01-OSK"]))).toBe(false);
  });
  it("false kalau stok di pasar 0 (tidak relevan, bukan soal 'tidak bergerak')", () => {
    const row = { kode: "D-01-OSK", cideng: 0 };
    expect(isTidakBergerak(row, "cideng", new Set())).toBe(false);
  });
  it("false kalau market kosong", () => {
    expect(isTidakBergerak({ kode: "X", cideng: 1 }, null, new Set())).toBe(false);
  });
});

describe("buildRestockList", () => {
  // Catatan: fitur ini SENGAJA tidak pernah lookup products.nama (permintaan
  // Denny 2026-08) — identifikasi produk pakai `kode` saja.
  const stok = [
    { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 15, cideng: 1, tegalgubug: 4 }, // menipis, target 3
    { id: "r2", kode: "D-02-SFN", size: "Gamis", warna: "MERAH", gudang: 4, cideng: 5, tegalgubug: 1 }, // cukup (>=3)
  ];

  it("hanya menyertakan kode yang punya minimal 1 detail menipis", () => {
    const result = buildRestockList(stok, "cideng");
    expect(result).toHaveLength(1);
    expect(result[0].kode).toBe("D-01-OSK");
  });

  it("detail berisi breakdown per size/warna, dengan status menipis, target & butuh", () => {
    const result = buildRestockList(stok, "cideng");
    expect(result[0].details).toHaveLength(1);
    expect(result[0].details[0]).toMatchObject({
      size: "Midi",
      warna: null, // "_" -> null (produk tanpa warna)
      marketQty: 1,
      gudangQty: 15,
      otherQty: 4,
      otherMarket: "tegalgubug",
      total: 20,
      target: 3,
      butuh: 2,
      menipis: true,
      hampirHabis: false,
    });
  });

  it("sort ascending: hampir habis duluan, lalu paling butuh banyak, lalu kode", () => {
    const stok2 = [
      { id: "a", kode: "A", gudang: 10, cideng: 1, tegalgubug: 9 }, // butuh 2, cukup total
      { id: "b", kode: "B", gudang: 5, cideng: 0, tegalgubug: 0 }, // butuh 3
    ];
    const result = buildRestockList(stok2, "cideng");
    expect(result.map((r) => r.kode)).toEqual(["B", "A"]); // B butuh lebih banyak (3 > 2)
  });

  it("kode dengan total stok < 3 (hampir habis) diprioritaskan di atas yang cuma menipis biasa", () => {
    const stok2 = [
      { id: "a", kode: "A", gudang: 10, cideng: 0, tegalgubug: 0 }, // menipis biasa, butuh 3
      { id: "b", kode: "B", gudang: 1, cideng: 0, tegalgubug: 1 }, // hampir habis (total 2), butuh 2
    ];
    const result = buildRestockList(stok2, "cideng");
    expect(result.map((r) => r.kode)).toEqual(["B", "A"]); // B hampir habis, tampil duluan walau butuh lebih sedikit
  });

  it("sort tiebreak by kode kalau maxButuh & anyHampirHabis sama", () => {
    const stok2 = [
      { id: "b", kode: "B", gudang: 8, cideng: 1, tegalgubug: 0 },
      { id: "a", kode: "A", gudang: 8, cideng: 1, tegalgubug: 0 },
    ];
    const result = buildRestockList(stok2, "cideng");
    expect(result.map((r) => r.kode)).toEqual(["A", "B"]);
  });

  it("menggabungkan banyak baris size/warna kode yang sama jadi SATU kartu, tapi tetap simpan rincian per warna (permintaan Denny 2026-08)", () => {
    const stok2 = [
      { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 10, cideng: 1, tegalgubug: 3 }, // butuh 2
      { id: "r2", kode: "D-01-OSK", size: "Gamis", warna: "MERAH", gudang: 5, cideng: 5, tegalgubug: 1 }, // cukup
    ];
    const result = buildRestockList(stok2, "cideng");
    // Satu kartu per kode (bukan satu per size/warna)
    expect(result).toHaveLength(1);
    expect(result[0].kode).toBe("D-01-OSK");
    // TAPI kedua rincian size/warna tetap ada di dalam kartu, masing-masing
    // dengan status menipis-nya sendiri — supaya kelihatan warna mana yang
    // perlu dibawa (HITAM) dan warna mana yang sudah cukup (MERAH).
    expect(result[0].details).toHaveLength(2);
    const hitam = result[0].details.find((d) => d.warna === "HITAM");
    const merah = result[0].details.find((d) => d.warna === "MERAH");
    expect(hitam.menipis).toBe(true);
    expect(merah.menipis).toBe(false);
  });

  it("kode dengan semua detail aman (>= target) tidak masuk daftar sama sekali", () => {
    const stok2 = [{ id: "r1", kode: "D-09-AMN", size: "Midi", warna: "_", gudang: 4, cideng: 5, tegalgubug: 1 }];
    const result = buildRestockList(stok2, "cideng");
    expect(result).toHaveLength(0);
  });

  it("kode dengan warna yang stok sistemnya < 3 ditandai hampirHabis dan butuh = sisa yang bisa dibawa", () => {
    const stok2 = [{ id: "r1", kode: "D-05-BLR", size: "Midi", warna: "BIRU", gudang: 1, cideng: 0, tegalgubug: 1 }];
    const result = buildRestockList(stok2, "cideng");
    expect(result).toHaveLength(1);
    expect(result[0].details[0]).toMatchObject({ hampirHabis: true, target: 2, butuh: 2 });
    expect(result[0].anyHampirHabis).toBe(true);
  });
});

describe("buildTidakBergerakList", () => {
  const stok = [
    { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "_", cideng: 3 },
    { id: "r2", kode: "D-02-SFN", size: "Gamis", warna: "MERAH", cideng: 5 },
  ];

  it("hanya item yg tidak ada di soldKodes", () => {
    const result = buildTidakBergerakList(stok, "cideng", ["D-02-SFN"]);
    expect(result).toHaveLength(1);
    expect(result[0].kode).toBe("D-01-OSK");
  });

  it("detail berisi size/warna & marketQty per baris, bukan agregat", () => {
    const result = buildTidakBergerakList(stok, "cideng", []);
    const osk = result.find((r) => r.kode === "D-01-OSK");
    expect(osk.details).toEqual([{ size: "Midi", warna: null, marketQty: 3 }]);
  });

  it("sort descending by totalMarketQty", () => {
    const result = buildTidakBergerakList(stok, "cideng", []);
    expect(result.map((r) => r.kode)).toEqual(["D-02-SFN", "D-01-OSK"]);
  });

  it("menggabungkan banyak baris size/warna kode yang sama jadi satu kartu, rincian tetap per warna", () => {
    const stok2 = [
      { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", cideng: 2 },
      { id: "r2", kode: "D-01-OSK", size: "Gamis", warna: "MERAH", cideng: 3 },
    ];
    const result = buildTidakBergerakList(stok2, "cideng", []);
    expect(result).toHaveLength(1);
    expect(result[0].totalMarketQty).toBe(5);
    expect(result[0].details).toHaveLength(2);
    expect(result[0].details.map((d) => d.warna).sort()).toEqual(["HITAM", "MERAH"]);
  });
});

describe("getDefaultTargetMarket", () => {
  it("Minggu -> besok Senin -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-23T12:00:00"))).toBe("cideng"); // Minggu
  });
  it("Rabu -> besok Kamis -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-19T12:00:00"))).toBe("cideng"); // Rabu
  });
  it("Kamis -> besok Jumat -> tegalgubug", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-20T12:00:00"))).toBe("tegalgubug"); // Kamis
  });
  it("Jumat -> besok Sabtu -> null (tidak ada pasar)", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-21T12:00:00"))).toBeNull(); // Jumat
  });
});

describe("marketLabel", () => {
  it("cideng -> Cideng, tegalgubug -> Tegalgubug", () => {
    expect(marketLabel("cideng")).toBe("Cideng");
    expect(marketLabel("tegalgubug")).toBe("Tegalgubug");
  });
  it("unknown -> '-'", () => {
    expect(marketLabel("gudang")).toBe("-");
    expect(marketLabel(null)).toBe("-");
  });
});
