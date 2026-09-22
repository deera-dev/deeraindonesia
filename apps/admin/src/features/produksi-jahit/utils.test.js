import { describe, it, expect } from "vitest";
import { STATUS_COLUMNS, statusLabel, groupByStatus, cardWarnaLabel, filterCards, groupDoneCardsByKode } from "./utils";

describe("STATUS_COLUMNS", () => {
  it("memiliki 3 kolom sesuai urutan workflow", () => {
    expect(STATUS_COLUMNS.map((c) => c.key)).toEqual(["belum_assign", "on_progress", "ready_finishing"]);
  });
});

describe("statusLabel", () => {
  it("mengembalikan label kolom yang benar", () => {
    expect(statusLabel("belum_assign")).toBe("Belum Assign");
    expect(statusLabel("on_progress")).toBe("On Progress");
    expect(statusLabel("ready_finishing")).toBe("Ready Finishing");
  });

  it("fallback ke status mentah kalau tidak dikenal", () => {
    expect(statusLabel("aneh")).toBe("aneh");
  });
});

describe("groupByStatus", () => {
  const cards = [
    { id: "1", status: "belum_assign" },
    { id: "2", status: "on_progress" },
    { id: "3", status: "ready_finishing" },
    { id: "4", status: "on_progress" },
  ];

  it("mengelompokkan kartu ke 3 kolom", () => {
    const groups = groupByStatus(cards);
    expect(groups.belum_assign.map((c) => c.id)).toEqual(["1"]);
    expect(groups.on_progress.map((c) => c.id)).toEqual(["2", "4"]);
    expect(groups.ready_finishing.map((c) => c.id)).toEqual(["3"]);
  });

  it("array kosong/undefined tidak crash", () => {
    expect(groupByStatus([])).toEqual({ belum_assign: [], on_progress: [], ready_finishing: [] });
    expect(groupByStatus(undefined)).toEqual({ belum_assign: [], on_progress: [], ready_finishing: [] });
  });

  it("status tidak dikenal fallback ke belum_assign (jaring pengaman data lama/rusak)", () => {
    const groups = groupByStatus([{ id: "x", status: "aneh" }]);
    expect(groups.belum_assign.map((c) => c.id)).toEqual(["x"]);
  });
});

describe("cardWarnaLabel", () => {
  it("menampilkan '(tanpa warna)' untuk warna '_'", () => {
    expect(cardWarnaLabel("_")).toBe("(tanpa warna)");
  });

  it("menampilkan warna apa adanya kalau bukan '_'", () => {
    expect(cardWarnaLabel("HITAM")).toBe("HITAM");
  });
});

describe("filterCards", () => {
  const cards = [
    { kode_produk: "D-01-OSK", nama_produk: "Gamis A", size: "Midi", warna: "HITAM", karyawan_nama: "Budi" },
    { kode_produk: "D-02-SFN", nama_produk: "Gamis B", size: "Gamis", warna: "PUTIH", karyawan_nama: null },
  ];

  it("mengembalikan semua kartu kalau search kosong", () => {
    expect(filterCards(cards, "")).toEqual(cards);
    expect(filterCards(cards, undefined)).toEqual(cards);
  });

  it("mencocokkan kode produk (case-insensitive)", () => {
    expect(filterCards(cards, "d-01")).toEqual([cards[0]]);
  });

  it("mencocokkan nama penjahit", () => {
    expect(filterCards(cards, "budi")).toEqual([cards[0]]);
  });

  it("mencocokkan warna", () => {
    expect(filterCards(cards, "putih")).toEqual([cards[1]]);
  });

  it("tidak crash kalau karyawan_nama null", () => {
    expect(filterCards(cards, "xyz")).toEqual([]);
  });
});

describe("groupDoneCardsByKode", () => {
  it("mengelompokkan kartu per kode_produk, urutan grup ikut kemunculan pertama", () => {
    const cards = [
      { id: "c1", kode_produk: "D-041-STL", nama_produk: "London", size: "Midi", warna: "ABU" },
      { id: "c2", kode_produk: "D-042-LDN", nama_produk: "London", size: "Midi", warna: "PINK" },
      { id: "c3", kode_produk: "D-041-STL", nama_produk: "London", size: "Midi", warna: "MAROON" },
    ];
    const groups = groupDoneCardsByKode(cards);
    expect(groups).toHaveLength(2);
    expect(groups[0].kode).toBe("D-041-STL");
    expect(groups[0].cards.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(groups[1].kode).toBe("D-042-LDN");
    expect(groups[1].cards.map((c) => c.id)).toEqual(["c2"]);
  });

  it("mempertahankan urutan asli kartu di dalam tiap grup (tidak di-sort ulang)", () => {
    const cards = [
      { id: "c1", kode_produk: "D-01", warna: "A" },
      { id: "c2", kode_produk: "D-01", warna: "B" },
      { id: "c3", kode_produk: "D-01", warna: "C" },
    ];
    const groups = groupDoneCardsByKode(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].cards.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("array kosong -> array grup kosong", () => {
    expect(groupDoneCardsByKode([])).toEqual([]);
  });

  it("default param -> [] kalau dipanggil tanpa argumen", () => {
    expect(groupDoneCardsByKode()).toEqual([]);
  });

  it("membawa nama_produk dari kartu pertama kode itu", () => {
    const cards = [{ id: "c1", kode_produk: "D-01", nama_produk: "Gamis A", warna: "X" }];
    expect(groupDoneCardsByKode(cards)[0].nama).toBe("Gamis A");
  });
});
