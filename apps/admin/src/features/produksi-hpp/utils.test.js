import { describe, it, expect } from "vitest";
import {
  fmtRp, fmt4, convertUnit, satuanUkurOptions, calcQtyPerBaju, normItem,
  calcTotal, LENGTH_UNITS, HPP_TABS,
} from "./utils";

describe("fmtRp", () => {
  it("formats positive number", () => { expect(fmtRp(100000)).toContain("100.000"); });
  it("handles 0", () => { expect(fmtRp(0)).toBe("Rp 0"); });
  it("handles non-number", () => { expect(fmtRp("abc")).toBe("Rp 0"); });
});

describe("fmt4", () => {
  it("trims trailing zeros", () => { expect(fmt4(1.5000)).toBe("1.5"); });
  it("keeps significant decimals", () => { expect(fmt4(1.1234)).toBe("1.1234"); });
  it("integer gives no decimal", () => { expect(fmt4(2)).toBe("2"); });
});

describe("LENGTH_UNITS", () => {
  it("contains yard, meter, m, cm", () => {
    expect(LENGTH_UNITS.has("yard")).toBe(true);
    expect(LENGTH_UNITS.has("meter")).toBe(true);
    expect(LENGTH_UNITS.has("m")).toBe(true);
    expect(LENGTH_UNITS.has("cm")).toBe(true);
  });
});

describe("convertUnit", () => {
  it("returns value when fromUnit === toUnit", () => {
    expect(convertUnit(5, "yard", "yard")).toBe(5);
  });
  it("converts yard to meter (approx)", () => {
    expect(convertUnit(1, "yard", "meter")).toBeCloseTo(0.9144);
  });
  it("converts meter to cm", () => {
    expect(convertUnit(1, "meter", "cm")).toBeCloseTo(100);
  });
  it("normalises 'm' to 'meter'", () => {
    expect(convertUnit(1, "m", "cm")).toBeCloseTo(100);
  });
  it("returns value unchanged for non-length units", () => {
    expect(convertUnit(5, "kg", "lembar")).toBe(5);
  });
  it("returns value when fromUnit is null", () => {
    expect(convertUnit(5, null, "meter")).toBe(5);
  });
});

describe("satuanUkurOptions", () => {
  it("returns length options for yard", () => {
    expect(satuanUkurOptions("yard")).toEqual(["yard", "meter", "cm"]);
  });
  it("returns single-item array for non-length unit", () => {
    expect(satuanUkurOptions("kg")).toEqual(["kg"]);
  });
});

describe("calcQtyPerBaju", () => {
  it("divides qty_dipakai by untuk_n_baju, converts unit", () => {
    // 10 yard / 5 baju = 2 yard/baju; same satuan_ukur & satuan → no conversion
    const item = { qty_dipakai: "10", untuk_n_baju: 5, satuan_ukur: "yard", satuan: "yard" };
    expect(calcQtyPerBaju(item)).toBeCloseTo(2);
  });
  it("defaults untuk_n_baju to 1 when zero", () => {
    const item = { qty_dipakai: "3", untuk_n_baju: 0, satuan_ukur: "yard", satuan: "yard" };
    expect(calcQtyPerBaju(item)).toBeCloseTo(3);
  });
  it("applies unit conversion from meter to yard", () => {
    const item = { qty_dipakai: "1", untuk_n_baju: 1, satuan_ukur: "meter", satuan: "yard" };
    expect(calcQtyPerBaju(item)).toBeCloseTo(1 / 0.9144);
  });
});

describe("normItem", () => {
  it("sets jenis=motif for old items with no jenis", () => {
    const item = { nama_bahan: "X", qty_per_baju: "2", satuan: "yard" };
    const n = normItem(item);
    expect(n.jenis).toBe("motif");
  });
  it("sets jenis=tambahan for items with qty_dipakai+untuk_n_baju", () => {
    const item = { nama_bahan: "X", qty_dipakai: "3", untuk_n_baju: 2, satuan: "yard" };
    const n = normItem(item);
    expect(n.jenis).toBe("tambahan");
  });
  it("sums warna_qtys for motif jenis", () => {
    const item = { jenis: "motif", warna_qtys: [{ qty: 3 }, { qty: 2 }], satuan: "yard" };
    const n = normItem(item);
    expect(n.qty_dipakai).toBe("5");
  });
  it("defaults satuan_ukur from satuan", () => {
    const item = { satuan: "meter" };
    const n = normItem(item);
    expect(n.satuan_ukur).toBe("meter");
  });
});

describe("calcTotal", () => {
  const config = {
    kancing_satuan: 500, plastik: 1800, hangtag: 200, tali_hangtag: 100,
    merk: 200, pin: 2800, kain_keras: 200, poin_denny: 10000, poin_haikal: 10000,
  };

  it("calculates total including bahan, upah_jahit, bordir, kancing", () => {
    const bahanItems = [
      { qty_dipakai: "2", untuk_n_baju: 1, satuan_ukur: "yard", satuan: "yard", harga_satuan: 50000 },
    ];
    const result = calcTotal({ bahanItems, upah_jahit: 30000, bordir: 0, kancing_qty: 2, kancing_extra: [], biaya_studio: 0, config });
    // biayaKain = 2 * 50000 = 100000
    // kancing = 2 * 500 = 1000
    // fixed costs: 1800+200+100+200+2800+200+10000+10000 = 25300
    // total = 100000 + 30000 + 1000 + 25300 = 156300
    expect(result.total).toBe(156300);
    expect(result.biayaKain).toBeCloseTo(100000);
  });

  it("includes kancing_extra in total", () => {
    const result = calcTotal({
      bahanItems: [],
      upah_jahit: 0,
      bordir: 0,
      kancing_qty: 0,
      kancing_extra: [{ label: "Extra", qty: 2, harga_per: 1000 }],
      biaya_studio: 0,
      config,
    });
    // extra = 2 * 1000 = 2000
    expect(result.breakdown.some(b => b.val === 2000)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it("returns breakdown array", () => {
    const result = calcTotal({ bahanItems: [], upah_jahit: 0, bordir: 0, kancing_qty: 0, kancing_extra: [], biaya_studio: 0, config });
    expect(Array.isArray(result.breakdown)).toBe(true);
    expect(result.breakdown.length).toBeGreaterThan(5);
  });
});

describe("HPP_TABS", () => {
  it("has 3 tabs", () => { expect(HPP_TABS).toHaveLength(3); });
  it("first tab is template", () => { expect(HPP_TABS[0].key).toBe("template"); });
});
