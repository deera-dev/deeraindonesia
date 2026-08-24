import { describe, it, expect } from "vitest";
import {
  groupConfigRows, CONFIG_GROUPS, biayaLainBreakdown, calcTotal, getBatchSiblingKodes,
  filterAndSortHppTemplates,
} from "./utils";
import { DEFAULT_HPP_FILTER } from "./store";

const allRows = [
  { key: "bordir", label: "Bordir", nilai: 10000 },
  { key: "jahit_midi", label: "Jahit (Midi)", nilai: 35000 },
  { key: "jahit_gamis", label: "Jahit (Gamis)", nilai: 45000 },
  { key: "plastik", label: "Plastik", nilai: 1800 },
  { key: "hangtag", label: "Hangtag", nilai: 200 },
  { key: "tali_hangtag", label: "Tali Hangtag", nilai: 100 },
  { key: "merk", label: "Merk", nilai: 200 },
  { key: "pin", label: "Pin", nilai: 2800 },
  { key: "kain_keras", label: "Kain Keras", nilai: 200 },
  { key: "kancing_satuan", label: "Kancing (per biji)", nilai: 500 },
  { key: "studio", label: "Studio Foto", nilai: 165000 },
  { key: "poin_denny", label: "Poin Denny", nilai: 10000 },
  { key: "poin_haikal", label: "Poin Haikal", nilai: 10000 },
];

describe("groupConfigRows", () => {
  it("groups all 13 seeded keys into the 4 defined categories", () => {
    const groups = groupConfigRows(allRows);
    expect(groups.map((g) => g.label)).toEqual([
      "Ongkos Jahit",
      "Bordir & Finishing",
      "Kemasan & Aksesoris",
      "Studio & Lainnya",
    ]);
  });

  it("does not drop or duplicate any row across groups", () => {
    const groups = groupConfigRows(allRows);
    const flat = groups.flatMap((g) => g.rows.map((r) => r.key));
    expect(flat.sort()).toEqual(allRows.map((r) => r.key).sort());
  });

  it("returns [] for empty input", () => {
    expect(groupConfigRows([])).toEqual([]);
  });

  it("returns [] for undefined input", () => {
    expect(groupConfigRows(undefined)).toEqual([]);
  });

  it("omits groups that have no matching rows", () => {
    const groups = groupConfigRows([{ key: "bordir", label: "Bordir", nilai: 10000 }]);
    expect(groups).toEqual([{ label: "Bordir & Finishing", rows: [{ key: "bordir", label: "Bordir", nilai: 10000 }] }]);
  });

  it("puts unrecognised keys into a defensive 'Lainnya' group instead of dropping them", () => {
    const row = { key: "biaya_baru", label: "Biaya Baru", nilai: 999 };
    const groups = groupConfigRows([row]);
    expect(groups).toEqual([{ label: "Lainnya", rows: [row] }]);
  });

  it("CONFIG_GROUPS covers exactly the 13 seeded hpp_config keys", () => {
    const allKeys = CONFIG_GROUPS.flatMap((g) => g.keys);
    expect(allKeys.sort()).toEqual(allRows.map((r) => r.key).sort());
  });
});


describe("biayaLainBreakdown — investigasi bug Poin tidak masuk Total HPP", () => {
  const fullConfig = {
    kancing_satuan: 500,
    plastik: 1800,
    hangtag: 200,
    tali_hangtag: 100,
    merk: 200,
    pin: 2800,
    kain_keras: 200,
    poin_denny: 10000,
    poin_haikal: 10000,
  };

  it("selalu menyertakan baris Poin Denny dan Poin Haikal", () => {
    const rows = biayaLainBreakdown({
      upah_jahit: 35000, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0, config: fullConfig,
    });
    const poinDenny = rows.find((r) => r.label === "Poin Denny");
    const poinHaikal = rows.find((r) => r.label === "Poin Haikal");
    expect(poinDenny).toBeDefined();
    expect(poinHaikal).toBeDefined();
    expect(poinDenny.val).toBe(10000);
    expect(poinHaikal.val).toBe(10000);
  });

  it("memakai nilai dari config saat tersedia (bukan hardcode)", () => {
    const rows = biayaLainBreakdown({
      upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0,
      config: { ...fullConfig, poin_denny: 12000, poin_haikal: 8000 },
    });
    expect(rows.find((r) => r.label === "Poin Denny").val).toBe(12000);
    expect(rows.find((r) => r.label === "Poin Haikal").val).toBe(8000);
  });

  it("fallback ke 10000 hanya saat config tidak punya key tsb (undefined), bukan saat config kosong total", () => {
    const rows = biayaLainBreakdown({
      upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0, config: {},
    });
    expect(rows.find((r) => r.label === "Poin Denny").val).toBe(10000);
    expect(rows.find((r) => r.label === "Poin Haikal").val).toBe(10000);
  });

  it("TIDAK menimpa nilai 0 eksplisit dengan default 10000 (?? bukan ||)", () => {
    const rows = biayaLainBreakdown({
      upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0,
      config: { ...fullConfig, poin_denny: 0, poin_haikal: 0 },
    });
    expect(rows.find((r) => r.label === "Poin Denny").val).toBe(0);
    expect(rows.find((r) => r.label === "Poin Haikal").val).toBe(0);
  });

  it("menyertakan seluruh 8 komponen biaya dari Harga Dasar (bukan cuma upah/bordir/studio/kancing)", () => {
    const rows = biayaLainBreakdown({
      upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0, config: fullConfig,
    });
    const labels = rows.map((r) => r.label);
    for (const l of ["Plastik", "Hangtag", "Tali Hangtag", "Merk", "Pin", "Kain Keras", "Poin Denny", "Poin Haikal"]) {
      expect(labels).toContain(l);
    }
  });
});

describe("calcTotal — Total HPP harus mencakup Poin Denny + Poin Haikal", () => {
  const config = {
    kancing_satuan: 500,
    plastik: 1800,
    hangtag: 200,
    tali_hangtag: 100,
    merk: 200,
    pin: 2800,
    kain_keras: 200,
    poin_denny: 10000,
    poin_haikal: 10000,
  };

  it("total bertambah tepat 20000 (10000+10000) saat poin diaktifkan dari 0", () => {
    const base = { bahanItems: [], upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0 };
    const withoutPoin = calcTotal({ ...base, config: { ...config, poin_denny: 0, poin_haikal: 0 } });
    const withPoin = calcTotal({ ...base, config });
    expect(withPoin.total - withoutPoin.total).toBe(20000);
  });

  it("breakdown yang dikembalikan calcTotal menyertakan Poin (dipakai HPPForm utk Rincian HPP)", () => {
    const { breakdown } = calcTotal({
      bahanItems: [], upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0, config,
    });
    expect(breakdown.some((b) => b.label === "Poin Denny" && b.val === 10000)).toBe(true);
    expect(breakdown.some((b) => b.label === "Poin Haikal" && b.val === 10000)).toBe(true);
  });

  it("total = biayaKain + jumlah seluruh breakdown (tidak ada double counting)", () => {
    const bahanItems = [
      { qty_dipakai: "4", untuk_n_baju: "2", satuan_ukur: "yard", satuan: "yard", harga_satuan: 15000 },
    ];
    const result = calcTotal({
      bahanItems, upah_jahit: 35000, bordir: 10000, kancing_qty: 5, kancing_extra: [], biaya_studio: 9500, config,
    });
    const expectedTotal = Math.round(
      result.biayaKain + result.breakdown.reduce((s, b) => s + b.val, 0),
    );
    expect(result.total).toBe(expectedTotal);
    // Sanity: breakdown dijumlah manual harus sama dengan (total - biayaKain)
    const manualBreakdownSum = result.breakdown.reduce((s, b) => s + b.val, 0);
    expect(result.total - Math.round(result.biayaKain)).toBe(manualBreakdownSum);
  });

  it("regresi: total_hpp untuk skenario khas tidak berubah setelah refactor calcTotal→biayaLainBreakdown", () => {
    // Skenario tetap (upah 35000, bordir 10000, studio 9500, kancing 5x500,
    // bahan 2yd@15000, config penuh) — angka ini adalah baseline sebelum
    // refactor; test ini memastikan ekstraksi biayaLainBreakdown() TIDAK
    // mengubah satu pun angka hasil (murni reorganisasi kode).
    const bahanItems = [
      { qty_dipakai: "4", untuk_n_baju: "2", satuan_ukur: "yard", satuan: "yard", harga_satuan: 15000 },
    ];
    const { total } = calcTotal({
      bahanItems, upah_jahit: 35000, bordir: 10000, kancing_qty: 5, kancing_extra: [], biaya_studio: 9500, config,
    });
    // biayaKain = 2 yd/baju * 15000 = 30000
    // biayaLain = 35000 + 10000 + 9500 + (5*500=2500) + 1800+200+100+200+2800+200 + 10000+10000
    //           = 35000+10000+9500+2500+1800+200+100+200+2800+200+10000+10000 = 82300
    // total = 30000 + 82300 = 112300
    expect(total).toBe(112300);
  });
});

describe("getBatchSiblingKodes", () => {
  it("returns sibling kodes sharing the same batch_no as the product's most recent batch, excluding the product itself", () => {
    const batches = [
      { kode_produk: "D-07-OSK", batch_no: "PROD-20260101-111", created_at: "2026-01-01T00:00:00Z" },
      { kode_produk: "D-08-SFN", batch_no: "PROD-20260101-111", created_at: "2026-01-01T00:00:00Z" },
      { kode_produk: "D-09-WLF", batch_no: "PROD-20260101-111", created_at: "2026-01-01T00:00:00Z" },
      { kode_produk: "D-10-XXX", batch_no: "PROD-20260102-222", created_at: "2026-01-02T00:00:00Z" },
    ];
    const result = getBatchSiblingKodes(batches, "D-07-OSK");
    expect(result.sort()).toEqual(["D-08-SFN", "D-09-WLF"]);
    expect(result).not.toContain("D-07-OSK");
  });

  it("returns [] when the product has no batches at all", () => {
    const batches = [
      { kode_produk: "D-08-SFN", batch_no: "PROD-20260101-111", created_at: "2026-01-01T00:00:00Z" },
    ];
    expect(getBatchSiblingKodes(batches, "D-99-ZZZ")).toEqual([]);
  });

  it("returns [] when batches is empty or undefined", () => {
    expect(getBatchSiblingKodes([], "D-07-OSK")).toEqual([]);
    expect(getBatchSiblingKodes(undefined, "D-07-OSK")).toEqual([]);
  });

  it("returns [] when kodeProduk is falsy", () => {
    const batches = [{ kode_produk: "D-07-OSK", batch_no: "PROD-1", created_at: "2026-01-01" }];
    expect(getBatchSiblingKodes(batches, "")).toEqual([]);
    expect(getBatchSiblingKodes(batches, null)).toEqual([]);
  });

  it("when a product has multiple batches with different batch_no over time, uses only the most recent one's siblings", () => {
    const batches = [
      // Batch lama (Januari): D-07-OSK diproduksi bareng D-01-AAA
      { kode_produk: "D-07-OSK", batch_no: "PROD-OLD", created_at: "2026-01-01T00:00:00Z" },
      { kode_produk: "D-01-AAA", batch_no: "PROD-OLD", created_at: "2026-01-01T00:00:00Z" },
      // Batch baru (Juli): D-07-OSK diproduksi ulang bareng D-02-BBB
      { kode_produk: "D-07-OSK", batch_no: "PROD-NEW", created_at: "2026-07-01T00:00:00Z" },
      { kode_produk: "D-02-BBB", batch_no: "PROD-NEW", created_at: "2026-07-01T00:00:00Z" },
    ];
    const result = getBatchSiblingKodes(batches, "D-07-OSK");
    expect(result).toEqual(["D-02-BBB"]);
    expect(result).not.toContain("D-01-AAA");
  });

  it("does not duplicate a sibling kode when it appears in multiple rows of the same batch_no (e.g. multiple sizes)", () => {
    const batches = [
      { kode_produk: "D-07-OSK", batch_no: "PROD-1", created_at: "2026-01-01T00:00:00Z" },
      { kode_produk: "D-08-SFN", batch_no: "PROD-1", created_at: "2026-01-01T00:00:00Z" },
      { kode_produk: "D-08-SFN", batch_no: "PROD-1", created_at: "2026-01-01T00:00:00Z" },
    ];
    const result = getBatchSiblingKodes(batches, "D-07-OSK");
    expect(result).toEqual(["D-08-SFN"]);
  });
});

describe("filterAndSortHppTemplates", () => {
  const TEMPLATES = [
    { id: "1", kode_produk: "D-01-OSK", total_hpp: 80000 },
    { id: "2", kode_produk: "D-02-SFN", total_hpp: 120000 },
    { id: "3", kode_produk: "D-03-KTN", total_hpp: 60000 },
  ];
  const PRODUCTS = [
    { kode: "D-01-OSK", nama: "Gamis Alpha" },
    { kode: "D-02-SFN", nama: "Mukena Beta" },
    { kode: "D-03-KTN", nama: "Gamis Gamma" },
  ];

  it("tanpa filter aktif: default sort 'terbaru' mengikuti urutan produk resmi dari `products` (permintaan Denny 2026-08)", () => {
    // PRODUCTS fixture urutannya D-01-OSK, D-02-SFN, D-03-KTN -> template
    // ikut urutan itu (bukan kode_produk descending seperti sebelumnya).
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, { products: PRODUCTS });
    expect(result.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("default sort 'terbaru' BUKAN alfabet kode — urutan murni ikut posisi di `products`", () => {
    // Balik urutan PRODUCTS: D-03-KTN "terbaru" duluan, walau alfabet kode
    // mestinya taruh D-01-OSK duluan.
    const reordered = [
      { kode: "D-03-KTN", nama: "Gamis Gamma" },
      { kode: "D-02-SFN", nama: "Mukena Beta" },
      { kode: "D-01-OSK", nama: "Gamis Alpha" },
    ];
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, { products: reordered });
    expect(result.map((t) => t.id)).toEqual(["3", "2", "1"]);
  });

  it("template yang kode_produk-nya sudah tidak ada di `products` ditaruh paling akhir, tiebreak alfabet", () => {
    const partialProducts = [{ kode: "D-02-SFN", nama: "Mukena Beta" }]; // D-01 & D-03 sudah "dihapus"
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, { products: partialProducts });
    expect(result.map((t) => t.id)).toEqual(["2", "1", "3"]); // D-02 duluan, lalu D-01/D-03 alfabet
  });

  it("sort kode-za (opsi manual, bukan default lagi)", () => {
    const filter = { ...DEFAULT_HPP_FILTER, sort: "kode-za" };
    const result = filterAndSortHppTemplates(TEMPLATES, filter, { products: PRODUCTS });
    expect(result.map((t) => t.id)).toEqual(["3", "2", "1"]);
  });

  it("search cocok kode_produk", () => {
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, {
      products: PRODUCTS,
      search: "D-02",
    });
    expect(result.map((t) => t.id)).toEqual(["2"]);
  });

  it("search cocok nama produk (join via products, case-insensitive)", () => {
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, {
      products: PRODUCTS,
      search: "gamis",
    });
    expect(result.map((t) => t.id).sort()).toEqual(["1", "3"]);
  });

  it("search tidak match: kosong", () => {
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, {
      products: PRODUCTS,
      search: "zzz",
    });
    expect(result).toEqual([]);
  });

  it("search tidak error saat products kosong/tidak ada", () => {
    const result = filterAndSortHppTemplates(TEMPLATES, DEFAULT_HPP_FILTER, { search: "D-01" });
    expect(result.map((t) => t.id)).toEqual(["1"]);
  });

  it("filter rentang Total HPP", () => {
    const filter = { ...DEFAULT_HPP_FILTER, hppMin: "70000", hppMax: "100000" };
    const result = filterAndSortHppTemplates(TEMPLATES, filter, { products: PRODUCTS });
    expect(result.map((t) => t.id)).toEqual(["1"]);
  });

  it("sort kode-az", () => {
    const filter = { ...DEFAULT_HPP_FILTER, sort: "kode-az" };
    const result = filterAndSortHppTemplates(TEMPLATES, filter, { products: PRODUCTS });
    expect(result.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("sort hpp-tertinggi", () => {
    const filter = { ...DEFAULT_HPP_FILTER, sort: "hpp-tertinggi" };
    const result = filterAndSortHppTemplates(TEMPLATES, filter, { products: PRODUCTS });
    expect(result.map((t) => t.id)).toEqual(["2", "1", "3"]);
  });

  it("sort hpp-terendah", () => {
    const filter = { ...DEFAULT_HPP_FILTER, sort: "hpp-terendah" };
    const result = filterAndSortHppTemplates(TEMPLATES, filter, { products: PRODUCTS });
    expect(result.map((t) => t.id)).toEqual(["3", "1", "2"]);
  });

  it("templates null/undefined tidak error", () => {
    expect(filterAndSortHppTemplates(null, DEFAULT_HPP_FILTER, {})).toEqual([]);
    expect(filterAndSortHppTemplates(undefined, DEFAULT_HPP_FILTER, {})).toEqual([]);
  });
});

