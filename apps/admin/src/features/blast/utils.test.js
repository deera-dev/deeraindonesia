import { describe, it, expect } from "vitest";
import { composeBlastMessage, applyTemplatePlaceholders, buildWaLink, calcProgress, normalizePhone } from "./utils";

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

describe("composeBlastMessage", () => {
  it("kembalikan teks apa adanya (trimmed) — TIDAK ada blok produk lagi (produk sekarang di-attach sbg foto, lihat BlastCampaignDetail)", () => {
    const result = composeBlastMessage("  Halo calon customer  ");
    expect(result).toBe("Halo calon customer");
  });

  it("kosong kalau input kosong/undefined", () => {
    expect(composeBlastMessage("")).toBe("");
    expect(composeBlastMessage(undefined)).toBe("");
  });
});

describe("applyTemplatePlaceholders", () => {
  it("ganti {{nama}} dengan nama target", () => {
    const result = applyTemplatePlaceholders("Apakah ini nomor {{nama}}?", { nama: "Toko Mawar" });
    expect(result).toBe("Apakah ini nomor Toko Mawar?");
  });

  it("ganti SEMUA kemunculan {{nama}}, bukan cuma yang pertama", () => {
    const result = applyTemplatePlaceholders("{{nama}}, halo {{nama}}", { nama: "Budi" });
    expect(result).toBe("Budi, halo Budi");
  });

  it("biarkan pesan apa adanya kalau tidak ada placeholder", () => {
    expect(applyTemplatePlaceholders("Halo semua", { nama: "Budi" })).toBe("Halo semua");
  });

  it("biarkan placeholder apa adanya kalau target tidak punya nama", () => {
    expect(applyTemplatePlaceholders("Halo {{nama}}", { nama: "" })).toBe("Halo {{nama}}");
    expect(applyTemplatePlaceholders("Halo {{nama}}", null)).toBe("Halo {{nama}}");
  });
});
