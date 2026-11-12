import { describe, it, expect } from "vitest";
import { aggregateKeepQtyByKode, aggregateKeepQtyByKodeSizeWarna } from "./utils";

const items = [
  {
    kode: "D-070-BAG",
    size: "Midi",
    warna: [
      { nama: "UNGU", qty: 3 },
      { nama: "HITAM", qty: 3 },
    ],
  },
  {
    kode: "D-070-BAG",
    size: "Midi",
    warna: [{ nama: "UNGU", qty: 2 }],
  },
  {
    kode: "D-065-ZUR",
    size: "Gamis",
    qty: 4, // format lama/tanpa warna — qty langsung di item
  },
];

describe("aggregateKeepQtyByKode", () => {
  it("menjumlahkan qty semua warna per kode, digabung antar baris keep berbeda", () => {
    expect(aggregateKeepQtyByKode(items)).toEqual({
      "D-070-BAG": 8, // (3+3) + 2
      "D-065-ZUR": 4,
    });
  });

  it("mengembalikan object kosong saat items kosong/undefined", () => {
    expect(aggregateKeepQtyByKode([])).toEqual({});
    expect(aggregateKeepQtyByKode(undefined)).toEqual({});
  });

  it("item tanpa kode diabaikan", () => {
    expect(aggregateKeepQtyByKode([{ size: "Midi", qty: 5 }])).toEqual({});
  });
});

describe("aggregateKeepQtyByKodeSizeWarna", () => {
  it("membuat breakdown kode -> size -> warna -> qty, digabung antar baris keep berbeda", () => {
    expect(aggregateKeepQtyByKodeSizeWarna(items)).toEqual({
      "D-070-BAG": {
        Midi: { UNGU: 5, HITAM: 3 },
      },
    });
  });

  it("item tanpa size atau tanpa array warna diabaikan (format lama qty-langsung tidak masuk breakdown per-warna)", () => {
    expect(aggregateKeepQtyByKodeSizeWarna(items)["D-065-ZUR"]).toBeUndefined();
  });

  it("entri warna dgn qty 0/negatif tidak dimasukkan", () => {
    const result = aggregateKeepQtyByKodeSizeWarna([
      { kode: "D-01-ABC", size: "Midi", warna: [{ nama: "HITAM", qty: 0 }, { nama: "MERAH", qty: -1 }] },
    ]);
    expect(result).toEqual({});
  });

  it("mengembalikan object kosong saat items kosong/undefined", () => {
    expect(aggregateKeepQtyByKodeSizeWarna([])).toEqual({});
    expect(aggregateKeepQtyByKodeSizeWarna(undefined)).toEqual({});
  });
});
