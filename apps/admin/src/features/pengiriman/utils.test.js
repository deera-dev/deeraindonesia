import { describe, it, expect } from "vitest";
import { fmtDate, fmtDateTime, mmToPx, PAPER_WIDTHS_MM, isPenerimaLengkap } from "./utils";

describe("fmtDate", () => {
  it("format tanggal Indonesia lengkap", () => {
    expect(fmtDate("2026-08-24")).toBe("24 Agustus 2026");
  });

  it("mengembalikan '-' utk input kosong/null", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate("")).toBe("-");
  });

  it("mengembalikan '-' utk format tidak valid", () => {
    expect(fmtDate("bukan-tanggal")).toBe("-");
  });

  it("TIDAK bergeser hari akibat timezone (parse manual, bukan new Date(iso) langsung)", () => {
    // Tanggal akhir bulan/awal tahun rawan bug pergeseran -1 hari kalau
    // pakai new Date("YYYY-MM-DD") langsung (UTC-parsed) di timezone WIB+.
    // `day: "2-digit"` di toLocaleDateString SELALU zero-pad (spec Intl),
    // jadi "01" bukan "1" — bukan bug pergeseran, murni format 2 digit.
    expect(fmtDate("2026-01-01")).toBe("01 Januari 2026");
    expect(fmtDate("2026-12-31")).toBe("31 Desember 2026");
  });
});

describe("fmtDateTime", () => {
  it("mengembalikan '-' utk input kosong", () => {
    expect(fmtDateTime(null)).toBe("-");
  });

  it("format tanggal+jam (tidak melempar utk ISO valid)", () => {
    expect(() => fmtDateTime("2026-08-24T10:30:00Z")).not.toThrow();
    expect(fmtDateTime("2026-08-24T10:30:00Z")).not.toBe("-");
  });
});

describe("PAPER_WIDTHS_MM", () => {
  it("punya opsi 78mm dan 100mm", () => {
    expect(PAPER_WIDTHS_MM["78"]).toBeDefined();
    expect(PAPER_WIDTHS_MM["100"]).toBeDefined();
    expect(PAPER_WIDTHS_MM["78"].label).toBe("78mm");
    expect(PAPER_WIDTHS_MM["100"].label).toBe("100mm");
  });
});

describe("mmToPx", () => {
  it("konversi mm ke px pakai standar CSS 96dpi (96/25.4 px per mm)", () => {
    expect(mmToPx(25.4)).toBe(96);
  });

  it("78mm -> ~295px", () => {
    expect(mmToPx(78)).toBe(Math.round(78 * (96 / 25.4)));
  });

  it("100mm -> ~378px", () => {
    expect(mmToPx(100)).toBe(Math.round(100 * (96 / 25.4)));
  });

  it("menerima input string (dari value tab paper width)", () => {
    expect(mmToPx("78")).toBe(mmToPx(78));
  });
});

describe("isPenerimaLengkap", () => {
  const lengkap = { nama: "Budi", no_hp: "0812", alamat: "Jl. A", ekspedisi_biasa: "JNE" };

  it("true kalau nama+no_hp+alamat+ekspedisi_biasa semua terisi", () => {
    expect(isPenerimaLengkap(lengkap)).toBe(true);
  });

  it("false kalau salah satu field kosong/null/whitespace", () => {
    expect(isPenerimaLengkap({ ...lengkap, no_hp: null })).toBe(false);
    expect(isPenerimaLengkap({ ...lengkap, no_hp: "" })).toBe(false);
    expect(isPenerimaLengkap({ ...lengkap, alamat: "   " })).toBe(false);
    expect(isPenerimaLengkap({ ...lengkap, ekspedisi_biasa: undefined })).toBe(false);
    expect(isPenerimaLengkap({ ...lengkap, nama: "" })).toBe(false);
  });

  it("false utk null/undefined", () => {
    expect(isPenerimaLengkap(null)).toBe(false);
    expect(isPenerimaLengkap(undefined)).toBe(false);
  });
});
