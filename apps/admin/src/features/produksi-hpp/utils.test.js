import { describe, it, expect } from "vitest";
import { groupConfigRows, CONFIG_GROUPS, biayaLainBreakdown, calcTotal } from "./utils";

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
