import { describe, it, expect, vi } from "vitest";

vi.mock("../../shared/lib/format", () => ({
  fmtRp: (n) => `Rp${n}`,
  fmtTanggal: (s) => s,
}));

import {
  TABS, JAHIT_MARKS, newKartu, newPermak, newProduk,
  calcUpahPotong, calcFinishingPerPcs, calcUpahFinishing, calcUpahKreatif,
  rincianPotong, rincianJahit, rincianKreatif, rincianQC,
  buildPerKaryawanMap, sumTambahan, sumKasbonDeduction,
  buildKasbonDeductionsPayload, cleanTambahan, calcTotalRequest,
  generateWAText, pettycashTerpakaiFromSaldo,
} from "./utils";

const cfg = {
  tarif_pola: 10000, tarif_sampel: 5000, tarif_potongan: 4000,
  tarif_gosok: 500, tarif_lipat: 300, tarif_buang_benang: 200,
  tarif_pasang_pin: 100, tarif_hangtag: 150, tarif_seri: 250,
  tarif_kancing: 50, tarif_video: 100000, tarif_foto: 20000, tarif_logo: 50000,
  tarif_qc: 500,
};

describe("TABS and constants", () => {
  it("TABS has 7 items", () => { expect(TABS).toHaveLength(7); });
  it("JAHIT_MARKS is array with values", () => { expect(JAHIT_MARKS.length).toBeGreaterThan(0); });
});

describe("factory functions", () => {
  it("newKartu returns object with upah 20000", () => { expect(newKartu().upah).toBe(20000); });
  it("newPermak returns object with upah empty", () => { expect(newPermak().upah).toBe(""); });
  it("newProduk returns object with kancing_qty empty", () => { expect(newProduk().kancing_qty).toBe(""); });
  it("newProduk returns object with kode_produk empty", () => { expect(newProduk().kode_produk).toBe(""); });
});

describe("calcUpahPotong", () => {
  it("sums pola + sampel + qty", () => {
    expect(calcUpahPotong({ jumlah_pola: 2, jumlah_sampel: 1, qty_potongan: 10, tarif_potongan: 4000 }, cfg))
      .toBe(2 * 10000 + 1 * 5000 + 10 * 4000);
  });
  it("handles zeros", () => {
    expect(calcUpahPotong({}, cfg)).toBe(0);
  });
});

describe("calcFinishingPerPcs", () => {
  it("sums all tarif components", () => {
    const total = cfg.tarif_gosok + cfg.tarif_lipat + cfg.tarif_buang_benang +
                  cfg.tarif_pasang_pin + cfg.tarif_hangtag + cfg.tarif_seri;
    expect(calcFinishingPerPcs(cfg)).toBe(total);
  });
});

describe("calcUpahFinishing", () => {
  it("sums per-pcs + kancing", () => {
    const items = [{ jumlah: 10, kancing_qty: 5 }];
    const tarifPcs = calcFinishingPerPcs(cfg);
    expect(calcUpahFinishing(items, cfg)).toBe(10 * tarifPcs + 5 * cfg.tarif_kancing);
  });
  it("handles empty items", () => { expect(calcUpahFinishing([], cfg)).toBe(0); });
});

describe("calcUpahKreatif", () => {
  it("sums video + foto + logo", () => {
    expect(calcUpahKreatif({ jumlah_video: 1, jumlah_foto: 2, jumlah_logo: 0 }, cfg))
      .toBe(1 * 100000 + 2 * 20000);
  });
});

describe("rincianPotong", () => {
  it("returns lines for pola, sampel, qty", () => {
    const r = { jumlah_pola: 1, jumlah_sampel: 1, qty_potongan: 5, tarif_potongan: 4000, total_upah: calcUpahPotong({ jumlah_pola: 1, jumlah_sampel: 1, qty_potongan: 5, tarif_potongan: 4000 }, cfg) };
    const lines = rincianPotong(r, cfg);
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
  it("adds tambahan manual when total differs", () => {
    const r = { jumlah_pola: 0, jumlah_sampel: 0, qty_potongan: 0, tarif_potongan: 4000, total_upah: 5000 };
    const lines = rincianPotong(r, cfg);
    expect(lines.some((l) => l.label === "Tambahan manual")).toBe(true);
  });
});

describe("rincianJahit", () => {
  it("returns lines for kartu items", () => {
    const r = { kartu_items: [{ kode: "D-01", ukuran: "Midi", warna: "HITAM", jumlah: 5, upah: 20000 }], permak_items: [] };
    expect(rincianJahit(r)).toHaveLength(1);
  });
  it("skips items with jumlah=0", () => {
    const r = { kartu_items: [{ jumlah: 0, upah: 20000 }], permak_items: [] };
    expect(rincianJahit(r)).toHaveLength(0);
  });
});

describe("rincianKreatif", () => {
  it("returns lines for video/foto", () => {
    const r = { jumlah_video: 1, jumlah_foto: 2, jumlah_logo: 0, total_upah: 100000 + 40000 };
    const lines = rincianKreatif(r, cfg);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});

describe("rincianQC", () => {
  it("returns pcs line", () => {
    const r = { jumlah_pcs: 10, total_upah: 10 * 500 };
    expect(rincianQC(r, cfg)).toHaveLength(1);
  });
});

describe("buildPerKaryawanMap", () => {
  it("aggregates by karyawan nama", () => {
    const potong = [{ karyawan: { nama: "BUDI" }, total_upah: 100000, jumlah_pola: 0, jumlah_sampel: 0, qty_potongan: 0, tarif_potongan: 0 }];
    const res = buildPerKaryawanMap({ potong, jahit: [], qc: [], kreatif: [], cfg });
    expect(res).toHaveLength(1);
    expect(res[0][0]).toBe("BUDI");
    expect(res[0][1].total).toBe(100000);
  });
  it("includes QC rows when includeQC=true", () => {
    const qc = [{ karyawan: { nama: "SARI" }, total_upah: 5000, jumlah_pcs: 10 }];
    const res = buildPerKaryawanMap({ potong: [], jahit: [], qc, kreatif: [], cfg, includeQC: true });
    expect(res).toHaveLength(1);
  });
  it("sorts by total desc", () => {
    const potong = [
      { karyawan: { nama: "A" }, total_upah: 50000, jumlah_pola: 0, jumlah_sampel: 0, qty_potongan: 0, tarif_potongan: 0 },
      { karyawan: { nama: "B" }, total_upah: 200000, jumlah_pola: 0, jumlah_sampel: 0, qty_potongan: 0, tarif_potongan: 0 },
    ];
    const res = buildPerKaryawanMap({ potong, jahit: [], qc: [], kreatif: [], cfg });
    expect(res[0][0]).toBe("B");
  });
});

describe("sumTambahan", () => {
  it("sums jumlah", () => { expect(sumTambahan([{ jumlah: 10000 }, { jumlah: 5000 }])).toBe(15000); });
  it("returns 0 for empty", () => { expect(sumTambahan([])).toBe(0); });
});

describe("sumKasbonDeduction", () => {
  it("sums deductions up to sisa", () => {
    const kasbon = [{ id: "kb1", sisa: 50000 }];
    expect(sumKasbonDeduction(kasbon, { kb1: 100000 })).toBe(50000); // capped at sisa
  });
  it("returns 0 when no deductions", () => {
    expect(sumKasbonDeduction([{ id: "kb1", sisa: 50000 }], {})).toBe(0);
  });
});

describe("buildKasbonDeductionsPayload", () => {
  it("filters zero amounts", () => {
    const kasbon = [{ id: "kb1", karyawan_id: "k1", sisa: 50000, karyawan: { nama: "BUDI" } }];
    const res = buildKasbonDeductionsPayload(kasbon, { kb1: 0 });
    expect(res).toHaveLength(0);
  });
  it("includes non-zero amounts capped at sisa", () => {
    const kasbon = [{ id: "kb1", karyawan_id: "k1", sisa: 50000, karyawan: { nama: "BUDI" } }];
    const res = buildKasbonDeductionsPayload(kasbon, { kb1: 100000 });
    expect(res[0].jumlah).toBe(50000);
  });
});

describe("cleanTambahan", () => {
  it("removes entries with no label and no jumlah", () => {
    expect(cleanTambahan([{ label: "", jumlah: "" }, { label: "X", jumlah: 10000 }])).toHaveLength(1);
  });
  it("keeps entries with only label", () => {
    expect(cleanTambahan([{ label: "X", jumlah: "" }])).toHaveLength(1);
  });
});

describe("pettycashTerpakaiFromSaldo", () => {
  // "Uang Denny & Wulan Terpakai" = bagian saldo yang MINUS (sudah
  // ditalangi dari kantong Denny & Wulan, perlu diganti). Lihat komentar
  // panjang di utils.js — BUKAN total pengeluaran "keluar" all-time.
  it("saldo minus → dikembalikan sebagai angka positif (jumlah yang perlu diganti)", () => {
    expect(pettycashTerpakaiFromSaldo(-2895800)).toBe(2895800);
  });

  it("saldo positif → 0 (belum ada yang ditalangi, tidak ada yang perlu diganti)", () => {
    expect(pettycashTerpakaiFromSaldo(1500000)).toBe(0);
  });

  it("saldo pas 0 → 0", () => {
    expect(pettycashTerpakaiFromSaldo(0)).toBe(0);
  });

  it("menangani null/undefined tanpa error → 0", () => {
    expect(pettycashTerpakaiFromSaldo(null)).toBe(0);
    expect(pettycashTerpakaiFromSaldo(undefined)).toBe(0);
    expect(pettycashTerpakaiFromSaldo()).toBe(0);
  });
});

describe("calcTotalRequest", () => {
  it("sums totalGaji + pettycash + tambahan - kasbon deductions", () => {
    const result = calcTotalRequest({
      totalGaji: 1000000, pettycash: 100000,
      tambahan: [{ jumlah: 50000 }],
      kasbon: [{ id: "kb1", sisa: 30000 }],
      kasbonDeds: { kb1: 30000 },
    });
    expect(result).toBe(1000000 + 100000 + 50000 - 30000);
  });
});

describe("generateWAText", () => {
  it("includes GAJIAN DEERA heading", () => {
    const text = generateWAText({
      gajian: { tanggal_sabtu: "2026-07-04", status: "draft" },
      totals: { potong: 100000, jahit: 0, finishing: 0, qa: 0, kreatif: 0, cmt: 0, gaji: 100000 },
      perKaryawan: [],
      tambahan: [], pettycash: 0, kasbonDeds: [], totalRequest: 100000,
    });
    expect(text).toContain("GAJIAN DEERA");
  });
  it("includes ✅ Final when status is final", () => {
    const text = generateWAText({
      gajian: { tanggal_sabtu: "2026-07-04", status: "final", total_gaji: 500000, total_potong: 500000, total_jahit: 0, total_finishing: 0, total_qa: 0, total_kreatif: 0, total_cmt: 0, pettycash: 0, tambahan: [], kasbon_deductions: [], total_request: 500000 },
      totals: null, perKaryawan: [], tambahan: [], pettycash: 0, kasbonDeds: [], totalRequest: 500000,
    });
    expect(text).toContain("Final");
  });
  it("includes per-karyawan section when perKaryawan provided", () => {
    const text = generateWAText({
      gajian: { tanggal_sabtu: "2026-07-04", status: "draft" },
      totals: { potong: 100000, jahit: 0, finishing: 0, qa: 0, kreatif: 0, cmt: 0, gaji: 100000 },
      perKaryawan: [["BUDI", { total: 100000, rincian: [], no_rekening: "001", nama_bank: "BCA" }]],
      tambahan: [], pettycash: 0, kasbonDeds: [], totalRequest: 100000,
    });
    expect(text).toContain("BUDI");
  });
});
