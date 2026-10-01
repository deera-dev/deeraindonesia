import { describe, it, expect } from "vitest";
import { buildDefaultMessage, buildWaLink, calcProgress, normalizePhone } from "./utils";

describe("normalizePhone", () => {
  it("ubah awalan 0 jadi 62", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });
  it("biarkan awalan 62 apa adanya", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });
  it("buang karakter non-digit (spasi, strip, +)", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("6281234567890");
  });
  it("kosong kalau input kosong/null", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(null)).toBe("");
  });
});

describe("buildWaLink", () => {
  it("pakai nomor ternormalisasi + pesan ter-encode", () => {
    const link = buildWaLink("081234567890", "Halo dunia");
    expect(link).toBe("https://wa.me/6281234567890?text=Halo%20dunia");
  });
  it("fallback wa.me/?text= kalau no HP kosong", () => {
    const link = buildWaLink("", "Halo");
    expect(link).toBe("https://wa.me/?text=Halo");
  });
});

describe("calcProgress", () => {
  it("hitung total/terkirim/dilewati/pending dengan benar", () => {
    const targets = [
      { status: "terkirim" },
      { status: "terkirim" },
      { status: "dilewati" },
      { status: "pending" },
    ];
    expect(calcProgress(targets)).toEqual({
      total: 4,
      terkirim: 2,
      dilewati: 1,
      pending: 1,
      selesai: false,
    });
  });

  it("selesai=true kalau tidak ada yang pending (dan total > 0)", () => {
    const targets = [{ status: "terkirim" }, { status: "dilewati" }];
    expect(calcProgress(targets).selesai).toBe(true);
  });

  it("selesai=false kalau list kosong", () => {
    expect(calcProgress([]).selesai).toBe(false);
  });
});

describe("buildDefaultMessage", () => {
  it("menggabungkan produk jadi satu teks (reuse generateWABulkText)", () => {
    const products = [{ kode: "D-01-OSK", nama: "Gamis A", variants: [], bahan: "Oscar" }];
    const text = buildDefaultMessage(products);
    expect(text).toContain("D-01-OSK");
    expect(text).toContain("Gamis A");
  });

  it("list kosong tetap mengembalikan string (tidak error)", () => {
    expect(typeof buildDefaultMessage([])).toBe("string");
    expect(typeof buildDefaultMessage(undefined)).toBe("string");
  });
});
