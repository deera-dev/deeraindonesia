import { describe, it, expect } from "vitest";
import {
  STATUS_COLUMNS,
  statusLabel,
  groupByStatus,
  cardWarnaLabel,
  filterCards,
  groupCardsByKode,
  parseJahitQr,
  jahitCardScanUrl,
} from "./utils";

describe("STATUS_COLUMNS", () => {
  it("memiliki 2 bucket: belum diterima & siap finishing", () => {
    expect(STATUS_COLUMNS.map((c) => c.key)).toEqual(["belum_diterima", "ready_finishing"]);
  });
});

describe("statusLabel", () => {
  it("mengembalikan label bucket yang benar", () => {
    expect(statusLabel("ready_finishing")).toBe("Siap Finishing");
    expect(statusLabel("belum_assign")).toBe("Belum Diterima");
    expect(statusLabel("on_progress")).toBe("Belum Diterima");
  });
});

describe("groupByStatus", () => {
  const cards = [
    { id: "1", status: "belum_assign" },
    { id: "2", status: "on_progress" },
    { id: "3", status: "ready_finishing" },
    { id: "4", status: "on_progress" },
  ];

  it("mengelompokkan kartu ke 2 bucket (belum_assign/on_progress jadi belum_diterima)", () => {
    const groups = groupByStatus(cards);
    expect(groups.belum_diterima.map((c) => c.id)).toEqual(["1", "2", "4"]);
    expect(groups.ready_finishing.map((c) => c.id)).toEqual(["3"]);
  });

  it("array kosong/undefined tidak crash", () => {
    expect(groupByStatus([])).toEqual({ belum_diterima: [], ready_finishing: [] });
    expect(groupByStatus(undefined)).toEqual({ belum_diterima: [], ready_finishing: [] });
  });

  it("status tidak dikenal fallback ke belum_diterima (jaring pengaman data lama/rusak)", () => {
    const groups = groupByStatus([{ id: "x", status: "aneh" }]);
    expect(groups.belum_diterima.map((c) => c.id)).toEqual(["x"]);
  });
});

describe("parseJahitQr", () => {
  it("mengekstrak uuid dari teks hasil scan", () => {
    expect(parseJahitQr("11111111-2222-3333-4444-555555555555")).toBe(
      "11111111-2222-3333-4444-555555555555",
    );
  });

  it("mengekstrak uuid dari dalam URL kartu jahit (hasil scan orang luar)", () => {
    expect(
      parseJahitQr(jahitCardScanUrl("11111111-2222-3333-4444-555555555555")),
    ).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("mengembalikan null kalau tidak ada uuid di dalam teks", () => {
    expect(parseJahitQr("bukan-qr-kartu-jahit")).toBeNull();
    expect(parseJahitQr("")).toBeNull();
    expect(parseJahitQr(null)).toBeNull();
  });
});

describe("jahitCardScanUrl", () => {
  it("mengarah ke halaman katalog umum dengan source tracker kartu_jahit", () => {
    const url = jahitCardScanUrl("11111111-2222-3333-4444-555555555555");
    expect(url).toBe(
      "https://deera.id/catalog?src=kartu_jahit&card=11111111-2222-3333-4444-555555555555",
    );
  });

  it("encode card id yang punya karakter khusus", () => {
    const url = jahitCardScanUrl("a b/c");
    expect(url).toBe("https://deera.id/catalog?src=kartu_jahit&card=a%20b%2Fc");
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

describe("groupCardsByKode", () => {
  it("mengelompokkan kartu per kode_produk, urutan grup ikut kemunculan pertama", () => {
    const cards = [
      { id: "c1", kode_produk: "D-041-STL", nama_produk: "London", size: "Midi", warna: "ABU" },
      { id: "c2", kode_produk: "D-042-LDN", nama_produk: "London", size: "Midi", warna: "PINK" },
      { id: "c3", kode_produk: "D-041-STL", nama_produk: "London", size: "Midi", warna: "MAROON" },
    ];
    const groups = groupCardsByKode(cards);
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
    const groups = groupCardsByKode(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].cards.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("array kosong -> array grup kosong", () => {
    expect(groupCardsByKode([])).toEqual([]);
  });

  it("default param -> [] kalau dipanggil tanpa argumen", () => {
    expect(groupCardsByKode()).toEqual([]);
  });

  it("membawa nama_produk dari kartu pertama kode itu", () => {
    const cards = [{ id: "c1", kode_produk: "D-01", nama_produk: "Gamis A", warna: "X" }];
    expect(groupCardsByKode(cards)[0].nama).toBe("Gamis A");
  });

  it("menghitung totalQty per grup (jumlah qty semua kartu di kode itu)", () => {
    const cards = [
      { id: "c1", kode_produk: "D-01", qty: 5 },
      { id: "c2", kode_produk: "D-01", qty: 3 },
      { id: "c3", kode_produk: "D-02", qty: 7 },
    ];
    const groups = groupCardsByKode(cards);
    expect(groups.find((g) => g.kode === "D-01").totalQty).toBe(8);
    expect(groups.find((g) => g.kode === "D-02").totalQty).toBe(7);
  });

  it("qty non-numerik/undefined dianggap 0 di totalQty", () => {
    const cards = [{ id: "c1", kode_produk: "D-01" }];
    expect(groupCardsByKode(cards)[0].totalQty).toBe(0);
  });
});
