import { describe, expect, it } from "vitest";
import {
  buildKeepStruk,
  fmtKeepTanggal,
  keepPcs,
  keepToCartItems,
  keepUsesOtherLocations,
  localDateStr,
} from "./utils";

describe("keepPcs", () => {
  it("menjumlah qty per warna & item simple", () => {
    expect(
      keepPcs([
        {
          kode: "A",
          warna: [
            { nama: "HITAM", qty: 2 },
            { nama: "MERAH", qty: 3 },
          ],
        },
        { kode: "B", qty: 4 },
      ]),
    ).toBe(9);
    expect(keepPcs([])).toBe(0);
    expect(keepPcs(null)).toBe(0);
  });
});

describe("fmtKeepTanggal", () => {
  it("format ringkas id-ID; kosong kalau tanggal tidak valid", () => {
    expect(fmtKeepTanggal("2026-10-05")).toMatch(/^5 Okt/);
    expect(fmtKeepTanggal("")).toBe("");
    expect(fmtKeepTanggal(null)).toBe("");
  });
});

describe("buildKeepStruk", () => {
  const keep = {
    date: "2026-10-05",
    created_at: "2026-10-05T03:00:00.000Z",
    location: "cideng",
    buyer_name: "BUDI",
    buyer_hp: "",
    created_by_name: "Kasir A",
    items: [{ kode: "A", qty: 1 }],
    discount: 5000,
    total: 95000,
  };
  it("belum lunas: pakai tanggal keep + flag belum_lunas", () => {
    const s = buildKeepStruk(keep);
    expect(s).toMatchObject({
      type: "sale",
      date: "2026-10-05",
      created_at: keep.created_at,
      belum_lunas: true,
      total: 95000,
      buyer_hp: null,
    });
  });
  it("lunas: tanggal/jam bayar, tanpa flag, kasir pembayar", () => {
    const now = new Date(2026, 9, 7, 10, 0);
    const s = buildKeepStruk(keep, { paid: true, now, cashierName: "Kasir B" });
    expect(s.belum_lunas).toBeUndefined();
    expect(s.date).toBe("2026-10-07");
    expect(s.created_by_name).toBe("Kasir B");
  });
  it("localDateStr tanggal lokal", () => {
    expect(localDateStr(new Date(2026, 9, 3, 23, 59))).toBe("2026-10-03");
  });
});

describe("keepToCartItems", () => {
  it("tambah key kode-size + image dari produk; field item dipertahankan", () => {
    const items = [
      {
        kode: "A",
        size: "Midi",
        harga: 100,
        qty: 2,
        warna: null,
        breakdown: [{ location: "gudang", qty: 2 }],
      },
    ];
    expect(keepToCartItems(items, [{ kode: "A", image: "img.jpg" }])).toEqual([
      { ...items[0], key: "A-Midi", image: "img.jpg" },
    ]);
    expect(keepToCartItems(items, [])[0].image).toBeNull();
    expect(keepToCartItems(null)).toEqual([]);
  });
});

describe("keepUsesOtherLocations", () => {
  it("true kalau ada breakdown dari lokasi selain lokasi keep (gabungan)", () => {
    const keep = (items) => ({ location: "gudang", items });
    expect(
      keepUsesOtherLocations(keep([{ qty: 1, breakdown: [{ location: "gudang", qty: 1 }] }])),
    ).toBe(false);
    expect(
      keepUsesOtherLocations(keep([{ qty: 1, breakdown: [{ location: "cideng", qty: 1 }] }])),
    ).toBe(true);
    expect(
      keepUsesOtherLocations(
        keep([
          { warna: [{ nama: "HITAM", qty: 1, breakdown: [{ location: "tegalgubug", qty: 1 }] }] },
        ]),
      ),
    ).toBe(true);
    expect(keepUsesOtherLocations(keep([{ qty: 1 }]))).toBe(false);
  });
});
