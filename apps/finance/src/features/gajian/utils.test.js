import { describe, it, expect, vi } from "vitest";

vi.mock("../../shared/lib/format", () => ({
  fmtRp: (n) => `Rp${n}`,
  fmtTanggal: (s) => s,
}));

import {
  TABS, JAHIT_MARKS, newKartu, newPermak, newProduk,
  calcUpahPotong, calcFinishingPerPcs, calcUpahFinishing, calcUpahKreatif,
  calcKancingQty, deriveKancingPerPcs, calcLubangQty, summarizeFinishingItems,
  rincianPotong, rincianJahit, rincianKreatif, rincianQC,
  buildPerKaryawanMap, sumTambahan, sumKasbonDeduction,
  buildKasbonDeductionsPayload, cleanTambahan, calcTotalRequest,
  generateWAText, pettycashTerpakaiFromSaldo,
  stokTotalFor, soldQtyFor, buildReconciliationRow, recalcReconciliationRow,
  newManualReconciliationRow, buildManualRowsFromLog, buildKodeReconciliation,
  BELI_GAS_LABEL, BELI_GAS_AMOUNT, PERSIAPAN_ATK_LABEL,
  findTambahanByLabel, otherTambahan, buildTambahanPayload,
  buildJahitContributionsByKode, buildJahitCardSync,
  sumFinishingItemsJumlah,
  autoSelectIfSingle,
} from "./utils";

const cfg = {
  tarif_pola: 10000, tarif_sampel: 5000, tarif_potongan: 4000,
  tarif_gosok: 500, tarif_lipat: 300, tarif_buang_benang: 200,
  tarif_pasang_pin: 100, tarif_hangtag: 150, tarif_seri: 250,
  tarif_kancing: 50, tarif_lubang: 75, tarif_video: 100000, tarif_foto: 20000, tarif_logo: 50000,
  tarif_qc: 500,
};

describe("TABS and constants", () => {
  it("TABS has 7 items", () => { expect(TABS).toHaveLength(7); });
  it("JAHIT_MARKS is array with values", () => { expect(JAHIT_MARKS.length).toBeGreaterThan(0); });
});

describe("factory functions", () => {
  it("newKartu returns object with upah 20000", () => { expect(newKartu().upah).toBe(20000); });
  it("newPermak returns object with upah empty", () => { expect(newPermak().upah).toBe(""); });
  // Permintaan Denny 2026-09: Kancing sekarang diisi per-pcs (bukan total
  // manual), plus field baru utk toggle Lubang.
  it("newProduk returns object with kancing_per_pcs empty", () => { expect(newProduk().kancing_per_pcs).toBe(""); });
  it("newProduk returns object with pakai_lubang false", () => { expect(newProduk().pakai_lubang).toBe(false); });
  it("newProduk returns object with lubang_per_pcs empty", () => { expect(newProduk().lubang_per_pcs).toBe(""); });
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
  // Permintaan Denny 2026-09: opsi Lubang, biaya terpisah dari Kancing.
  it("sums per-pcs + kancing + lubang", () => {
    const items = [{ jumlah: 10, kancing_qty: 5, lubang_qty: 3 }];
    const tarifPcs = calcFinishingPerPcs(cfg);
    expect(calcUpahFinishing(items, cfg)).toBe(10 * tarifPcs + 5 * cfg.tarif_kancing + 3 * cfg.tarif_lubang);
  });
  it("lubang_qty diabaikan (dianggap 0) kalau cfg.tarif_lubang belum ada (backward-compat)", () => {
    const items = [{ jumlah: 1, kancing_qty: 0, lubang_qty: 4 }];
    const { tarif_lubang, ...cfgNoLubang } = cfg;
    const tarifPcs = calcFinishingPerPcs(cfgNoLubang);
    expect(calcUpahFinishing(items, cfgNoLubang)).toBe(1 * tarifPcs);
  });
});

describe("calcKancingQty", () => {
  it("jumlah pcs x kancing per pcs", () => {
    expect(calcKancingQty(42, 8)).toBe(336);
  });
  it("handles kosong/NaN sbg 0", () => {
    expect(calcKancingQty("", "")).toBe(0);
    expect(calcKancingQty(10, "")).toBe(0);
  });
});

describe("deriveKancingPerPcs", () => {
  it("pakai kancing_per_pcs langsung kalau sudah ada (record baru)", () => {
    expect(deriveKancingPerPcs({ jumlah: 42, kancing_qty: 336, kancing_per_pcs: 8 })).toBe(8);
  });
  it("derive dari kancing_qty / jumlah kalau kancing_per_pcs belum ada (record lama)", () => {
    expect(deriveKancingPerPcs({ jumlah: 42, kancing_qty: 336 })).toBe(8);
  });
  it("return 0 kalau jumlah lama 0/tidak ada", () => {
    expect(deriveKancingPerPcs({ jumlah: 0, kancing_qty: 336 })).toBe(0);
    expect(deriveKancingPerPcs(null)).toBe(0);
  });
});

describe("calcLubangQty", () => {
  it("jumlah pcs x lubang per pcs, kalau pakaiLubang true", () => {
    expect(calcLubangQty(42, 8, true)).toBe(336);
  });
  it("0 kalau pakaiLubang false, walau lubang per pcs diisi", () => {
    expect(calcLubangQty(42, 8, false)).toBe(0);
  });
});

describe("summarizeFinishingItems", () => {
  it("breakdown total Finishing/Kancing/Lubang dari beberapa item", () => {
    const items = [
      { jumlah: 10, kancing_qty: 20, lubang_qty: 5 },
      { jumlah: 5, kancing_qty: 0, lubang_qty: 0 },
    ];
    const tarifPcs = calcFinishingPerPcs(cfg);
    const result = summarizeFinishingItems(items, cfg);
    expect(result.totalFinishingBiaya).toBe(15 * tarifPcs);
    expect(result.totalKancingQty).toBe(20);
    expect(result.totalKancingBiaya).toBe(20 * cfg.tarif_kancing);
    expect(result.totalLubangQty).toBe(5);
    expect(result.totalLubangBiaya).toBe(5 * cfg.tarif_lubang);
    expect(result.grandTotal).toBe(calcUpahFinishing(items, cfg));
  });
  it("handles array kosong", () => {
    const result = summarizeFinishingItems([], cfg);
    expect(result).toEqual({
      totalFinishingBiaya: 0, totalKancingQty: 0, totalKancingBiaya: 0,
      totalLubangQty: 0, totalLubangBiaya: 0, grandTotal: 0,
    });
  });
});

describe("calcUpahKreatif", () => {
  it("sums video + foto + logo", () => {
    expect(calcUpahKreatif({ jumlah_video: 1, jumlah_foto: 2, jumlah_logo: 0 }, cfg))
      .toBe(1 * 100000 + 2 * 20000);
  });
});

// Permintaan Denny 2026-09: auto-isi Jumlah QC dari total Finishing periode ini.
describe("sumFinishingItemsJumlah", () => {
  it("menjumlah jumlah SEMUA kode digabung (contoh Denny: 20+5+10=35)", () => {
    const items = [
      { kode_produk: "D-01", jumlah: 20 },
      { kode_produk: "D-02", jumlah: 5 },
      { kode_produk: "D-03", jumlah: 10 },
    ];
    expect(sumFinishingItemsJumlah(items)).toBe(35);
  });
  it("array kosong -> 0", () => {
    expect(sumFinishingItemsJumlah([])).toBe(0);
  });
  it("default param -> 0 kalau dipanggil tanpa argumen", () => {
    expect(sumFinishingItemsJumlah()).toBe(0);
  });
  it("mengabaikan jumlah non-numerik (NaN -> 0)", () => {
    expect(sumFinishingItemsJumlah([{ jumlah: "abc" }, { jumlah: 10 }])).toBe(10);
  });
});

describe("autoSelectIfSingle", () => {
  it("mengembalikan satu-satunya opsi kalau cuma ada 1", () => {
    expect(autoSelectIfSingle(["Midi"])).toBe("Midi");
  });
  it("mengembalikan '' kalau opsi lebih dari 1 (jangan asal pilih)", () => {
    expect(autoSelectIfSingle(["Midi", "Gamis"])).toBe("");
  });
  it("mengembalikan '' kalau array kosong", () => {
    expect(autoSelectIfSingle([])).toBe("");
  });
  it("default param -> '' kalau dipanggil tanpa argumen", () => {
    expect(autoSelectIfSingle()).toBe("");
  });
  it("mengabaikan nilai falsy (null/undefined/'') sebelum menghitung panjang", () => {
    expect(autoSelectIfSingle([null, "Merah", undefined])).toBe("Merah");
  });
  it("2 opsi valid setelah filter falsy -> tetap '' (bukan 1 opsi asli)", () => {
    expect(autoSelectIfSingle([null, "Merah", "Biru"])).toBe("");
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

// ── Rekonsiliasi Stok Masuk dari Finishing (permintaan Denny 2026-09) ────────

describe("stokTotalFor", () => {
  const stokRows = [
    { size: "Midi", warna: "HITAM", gudang: 5, cideng: 2, tegalgubug: 1 },
    { size: "Midi", warna: "PUTIH", gudang: 0, cideng: 0, tegalgubug: 0 },
  ];
  it("menjumlahkan semua lokasi utk size+warna yang cocok", () => {
    expect(stokTotalFor(stokRows, "Midi", "HITAM")).toBe(8);
  });
  it("mengembalikan 0 kalau kombinasi tidak ditemukan", () => {
    expect(stokTotalFor(stokRows, "Gamis", "HITAM")).toBe(0);
  });
  it("aman utk array kosong/undefined", () => {
    expect(stokTotalFor([], "Midi", "HITAM")).toBe(0);
    expect(stokTotalFor(undefined, "Midi", "HITAM")).toBe(0);
  });
});

describe("soldQtyFor", () => {
  const soldRows = [{ size: "Midi", warna: "HITAM", qty: 13 }];
  it("mengembalikan qty yang cocok", () => {
    expect(soldQtyFor(soldRows, "Midi", "HITAM")).toBe(13);
  });
  it("mengembalikan 0 kalau tidak ditemukan", () => {
    expect(soldQtyFor(soldRows, "Midi", "PUTIH")).toBe(0);
  });
});

describe("buildReconciliationRow", () => {
  const soldRows = [{ size: "Midi", warna: "HITAM", qty: 3 }];
  const stokRows = [{ size: "Midi", warna: "HITAM", gudang: 2, cideng: 0, tegalgubug: 0 }];

  it("qtyDitambahkan = qtyKartu - stok - terjual", () => {
    const row = buildReconciliationRow({ kode: "D-01", size: "Midi", warna: "HITAM", qtyKartu: 10, cardId: "c1", soldRows, stokRows });
    expect(row).toMatchObject({ stokSaatIni: 2, terjualSaatIni: 3, qtyDitambahkan: 5 });
  });

  it("minimal 0 kalau stok+terjual sudah melebihi qtyKartu (sudah kebawa ke pasar/terjual duluan)", () => {
    const row = buildReconciliationRow({ kode: "D-01", size: "Midi", warna: "HITAM", qtyKartu: 4, cardId: "c1", soldRows, stokRows });
    expect(row.qtyDitambahkan).toBe(0);
  });

  it("kombinasi size+warna belum pernah ada stok/penjualan -> stokSaatIni & terjualSaatIni 0", () => {
    const row = buildReconciliationRow({ kode: "D-01", size: "Gamis", warna: "MERAH", qtyKartu: 7, cardId: null, soldRows, stokRows });
    expect(row).toMatchObject({ stokSaatIni: 0, terjualSaatIni: 0, qtyDitambahkan: 7 });
  });
});

describe("recalcReconciliationRow", () => {
  it("hasilnya sama dengan buildReconciliationRow untuk input yang sama", () => {
    const soldRows = [];
    const stokRows = [];
    const row = { kode: "D-01", size: "Midi", warna: "HITAM", qtyKartu: 5, cardId: null };
    expect(recalcReconciliationRow(row, soldRows, stokRows)).toEqual(
      buildReconciliationRow({ ...row, soldRows, stokRows }),
    );
  });
});

describe("newManualReconciliationRow", () => {
  // Bugfix 2026-09 (permintaan Denny: "saya gamau default 0, maunya
  // placeholder aja") — qtyKartu WAJIB "" (bukan 0) supaya input di
  // FinishingStockModal.jsx mulai kosong, bukan pre-filled "0".
  it("baris kosong dgn cardId null, qtyKartu string kosong (BUKAN 0)", () => {
    expect(newManualReconciliationRow("D-01")).toEqual({
      kode: "D-01", size: "", warna: "", qtyKartu: "", qtyKartuPlaceholder: 0,
      cardId: null, stokSaatIni: 0, terjualSaatIni: 0, qtyDitambahkan: 0,
    });
  });

  it("bisa diisi size/warna/placeholder awal (dipakai buildManualRowsFromLog)", () => {
    const row = newManualReconciliationRow("D-01", { size: "Midi", warna: "HITAM", placeholder: 12 });
    expect(row.size).toBe("Midi");
    expect(row.warna).toBe("HITAM");
    expect(row.qtyKartuPlaceholder).toBe(12);
    expect(row.qtyKartu).toBe(""); // tetap kosong walau ada placeholder
  });
});

describe("buildManualRowsFromLog", () => {
  it("seed satu baris manual per size+warna, placeholder = qty_kartu terakhir", () => {
    const logRows = [
      { size: "Midi", warna: "HITAM", qty_kartu: 10, created_at: "2026-09-05" },
      { size: "Gamis", warna: "MERAH", qty_kartu: 4, created_at: "2026-09-04" },
    ];
    const rows = buildManualRowsFromLog("D-01", logRows);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kode: "D-01", size: "Midi", warna: "HITAM", qtyKartu: "", qtyKartuPlaceholder: 10 });
    expect(rows[1]).toMatchObject({ kode: "D-01", size: "Gamis", warna: "MERAH", qtyKartu: "", qtyKartuPlaceholder: 4 });
  });

  it("dedupe per size+warna — kalau size+warna sama muncul >1x di log, hanya baris PERTAMA (terbaru, log sudah diurutkan desc) yang dipakai", () => {
    const logRows = [
      { size: "Midi", warna: "HITAM", qty_kartu: 10, created_at: "2026-09-05" }, // terbaru
      { size: "Midi", warna: "HITAM", qty_kartu: 7, created_at: "2026-08-01" }, // lama, diabaikan
    ];
    const rows = buildManualRowsFromLog("D-01", logRows);
    expect(rows).toHaveLength(1);
    expect(rows[0].qtyKartuPlaceholder).toBe(10);
  });

  it("logRows kosong -> tidak ada baris", () => {
    expect(buildManualRowsFromLog("D-01", [])).toEqual([]);
  });
});

describe("buildKodeReconciliation", () => {
  const item = { kode_produk: "D-01-OSK", nama_produk: "Gamis A", jumlah: 15 };

  it("mismatch=false kalau total qty kartu sama dgn jumlah Finance", () => {
    const cards = [{ id: "c1", size: "Midi", warna: "HITAM", qty: 10 }, { id: "c2", size: "Midi", warna: "PUTIH", qty: 5 }];
    const result = buildKodeReconciliation({ item, cards, soldRows: [], stokRows: [] });
    expect(result.mismatch).toBe(false);
    expect(result.cardsSum).toBe(15);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].cardId).toBe("c1");
  });

  it("mismatch=true kalau total qty kartu beda dgn jumlah Finance", () => {
    const cards = [{ id: "c1", size: "Midi", warna: "HITAM", qty: 10 }];
    const result = buildKodeReconciliation({ item, cards, soldRows: [], stokRows: [] });
    expect(result.mismatch).toBe(true);
    expect(result.cardsSum).toBe(10);
  });

  it("mismatch=true kalau belum ada kartu sama sekali DAN tidak ada riwayat log -> rows kosong total", () => {
    const result = buildKodeReconciliation({ item, cards: [], soldRows: [], stokRows: [] });
    expect(result.mismatch).toBe(true);
    expect(result.rows).toEqual([]);
  });

  // Bugfix 2026-09 (rekonsiliasi ulang / edit): kalau kartu sudah "done"
  // semua (cards kosong) TAPI kode ini PERNAH direkonsiliasi (ada riwayat di
  // stok_masuk_log, dilewatkan lewat `logRows`), seed baris manual dari
  // riwayat itu — placeholder, bukan value (lihat buildManualRowsFromLog).
  it("cards kosong TAPI ada logRows -> seed baris manual dari riwayat (placeholder, bukan value)", () => {
    const logRows = [{ size: "Midi", warna: "HITAM", qty_kartu: 15, created_at: "2026-09-01" }];
    const result = buildKodeReconciliation({ item, cards: [], soldRows: [], stokRows: [], logRows });
    expect(result.mismatch).toBe(true); // tetap mismatch, cardsSum masih 0
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ size: "Midi", warna: "HITAM", qtyKartu: "", qtyKartuPlaceholder: 15, cardId: null });
  });

  it("logRows diabaikan kalau cards TIDAK kosong (jalur normal, kartu masih ready_finishing)", () => {
    const cards = [{ id: "c1", size: "Midi", warna: "HITAM", qty: 15 }];
    const logRows = [{ size: "Midi", warna: "HITAM", qty_kartu: 999, created_at: "2026-09-01" }];
    const result = buildKodeReconciliation({ item, cards, soldRows: [], stokRows: [], logRows });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cardId).toBe("c1"); // dari kartu asli, bukan dari log
  });

  it("menyertakan soldRows/stokRows mentah utk recalc di modal", () => {
    const soldRows = [{ size: "Midi", warna: "HITAM", qty: 1 }];
    const stokRows = [{ size: "Midi", warna: "HITAM", gudang: 1, cideng: 0, tegalgubug: 0 }];
    const result = buildKodeReconciliation({ item, cards: [], soldRows, stokRows });
    expect(result.soldRows).toEqual(soldRows);
    expect(result.stokRows).toEqual(stokRows);
  });
});

// ── "Beli Gas" & "Persiapan ATK" (permintaan Denny 2026-09) ─────────────────

describe("findTambahanByLabel / otherTambahan", () => {
  const tambahan = [
    { label: "Transport", jumlah: 20000 },
    { label: BELI_GAS_LABEL, jumlah: 100000 },
    { label: PERSIAPAN_ATK_LABEL, jumlah: 35000 },
  ];

  it("findTambahanByLabel menemukan entri sesuai label persis", () => {
    expect(findTambahanByLabel(tambahan, BELI_GAS_LABEL)).toEqual({ label: BELI_GAS_LABEL, jumlah: 100000 });
  });

  it("findTambahanByLabel null kalau tidak ketemu", () => {
    expect(findTambahanByLabel(tambahan, "Tidak Ada")).toBeNull();
  });

  it("otherTambahan membuang Beli Gas & Persiapan ATK, sisakan yang freeform", () => {
    expect(otherTambahan(tambahan)).toEqual([{ label: "Transport", jumlah: 20000 }]);
  });
});

describe("buildTambahanPayload", () => {
  it("gabungkan freeform + Beli Gas (kalau enabled) + Persiapan ATK (kalau > 0)", () => {
    const result = buildTambahanPayload({
      otherItems: [{ label: "Transport", jumlah: 20000 }],
      beliGasEnabled: true,
      atkJumlah: 35000,
    });
    expect(result).toEqual([
      { label: "Transport", jumlah: 20000 },
      { label: BELI_GAS_LABEL, jumlah: BELI_GAS_AMOUNT },
      { label: PERSIAPAN_ATK_LABEL, jumlah: 35000 },
    ]);
  });

  it("Beli Gas tidak disertakan kalau beliGasEnabled false", () => {
    const result = buildTambahanPayload({ otherItems: [], beliGasEnabled: false, atkJumlah: 0 });
    expect(result.find((t) => t.label === BELI_GAS_LABEL)).toBeUndefined();
  });

  it("Persiapan ATK tidak disertakan kalau atkJumlah 0/kosong", () => {
    const result = buildTambahanPayload({ otherItems: [], beliGasEnabled: false, atkJumlah: 0 });
    expect(result).toEqual([]);
  });

  it("default params -> array kosong", () => {
    expect(buildTambahanPayload({})).toEqual([]);
  });
});

// ── Sinkronisasi Kartu Jahit dari Finalisasi Gajian (permintaan Denny 2026-09) ──

describe("buildJahitContributionsByKode", () => {
  it("gabungkan qty per kode per karyawan, semua warna/ukuran digabung", () => {
    const jahitRows = [
      {
        karyawan_id: "k1",
        karyawan: { nama: "Budi" },
        kartu_items: [
          { kode: "D-01", warna: "HITAM", jumlah: 5 },
          { kode: "D-01", warna: "MERAH", jumlah: 3 },
          { kode: "D-02", warna: "_", jumlah: 2 },
        ],
      },
    ];
    const result = buildJahitContributionsByKode(jahitRows);
    expect(result["D-01"]).toEqual([{ karyawanId: "k1", karyawanNama: "Budi", qty: 8 }]);
    expect(result["D-02"]).toEqual([{ karyawanId: "k1", karyawanNama: "Budi", qty: 2 }]);
  });

  it("kode yang sama dikerjakan >1 karyawan -> kontribusi terpisah berurutan", () => {
    const jahitRows = [
      { karyawan_id: "k1", karyawan: { nama: "Budi" }, kartu_items: [{ kode: "D-01", jumlah: 10 }] },
      { karyawan_id: "k2", karyawan: { nama: "Ani" }, kartu_items: [{ kode: "D-01", jumlah: 15 }] },
    ];
    const result = buildJahitContributionsByKode(jahitRows);
    expect(result["D-01"]).toEqual([
      { karyawanId: "k1", karyawanNama: "Budi", qty: 10 },
      { karyawanId: "k2", karyawanNama: "Ani", qty: 15 },
    ]);
  });

  it("abaikan item tanpa kode atau qty <= 0", () => {
    const jahitRows = [
      { karyawan_id: "k1", karyawan: { nama: "Budi" }, kartu_items: [{ kode: "", jumlah: 5 }, { kode: "D-01", jumlah: 0 }] },
    ];
    expect(buildJahitContributionsByKode(jahitRows)).toEqual({});
  });

  it("karyawan tanpa nama (join gagal) -> fallback em dash", () => {
    const jahitRows = [{ karyawan_id: "k1", kartu_items: [{ kode: "D-01", jumlah: 5 }] }];
    expect(buildJahitContributionsByKode(jahitRows)["D-01"][0].karyawanNama).toBe("—");
  });

  it("input kosong -> object kosong", () => {
    expect(buildJahitContributionsByKode([])).toEqual({});
  });
});

describe("buildJahitCardSync", () => {
  it("tandai kartu selesai sejumlah angka Jahit (satu karyawan), urut kartu paling lama dulu", () => {
    const contributions = [{ karyawanId: "k1", karyawanNama: "Budi", qty: 8 }];
    const cards = [
      { id: "c1", qty: 5 },
      { id: "c2", qty: 3 },
      { id: "c3", qty: 4 }, // TIDAK ikut selesai — kuota Budi (8) sudah habis di c1+c2
    ];
    const updates = buildJahitCardSync({ contributions, cards });
    expect(updates).toEqual([
      { cardId: "c1", karyawanId: "k1", karyawanNama: "Budi" },
      { cardId: "c2", karyawanId: "k1", karyawanNama: "Budi" },
    ]);
  });

  it("reject/selisih: total qty kartu > angka Jahit -> sisa kartu TIDAK disentuh (bukan error)", () => {
    const contributions = [{ karyawanId: "k1", karyawanNama: "Budi", qty: 5 }];
    const cards = [{ id: "c1", qty: 5 }, { id: "c2", qty: 2 }];
    const updates = buildJahitCardSync({ contributions, cards });
    expect(updates.map((u) => u.cardId)).toEqual(["c1"]);
  });

  it("multi-penjahit: kartu diisi sesuai urutan qty tiap penjahit, satu kartu tidak dipecah", () => {
    const contributions = [
      { karyawanId: "k1", karyawanNama: "Budi", qty: 10 },
      { karyawanId: "k2", karyawanNama: "Ani", qty: 15 },
    ];
    // c1(6)+c2(6)=12 > kuota Budi(10) -> c2 TETAP milik Budi sepenuhnya (atomik),
    // Ani mulai dari c3.
    const cards = [{ id: "c1", qty: 6 }, { id: "c2", qty: 6 }, { id: "c3", qty: 9 }, { id: "c4", qty: 6 }];
    const updates = buildJahitCardSync({ contributions, cards });
    expect(updates).toEqual([
      { cardId: "c1", karyawanId: "k1", karyawanNama: "Budi" },
      { cardId: "c2", karyawanId: "k1", karyawanNama: "Budi" },
      { cardId: "c3", karyawanId: "k2", karyawanNama: "Ani" },
      { cardId: "c4", karyawanId: "k2", karyawanNama: "Ani" },
    ]);
  });

  it("cards kosong -> tidak ada update", () => {
    expect(buildJahitCardSync({ contributions: [{ karyawanId: "k1", karyawanNama: "Budi", qty: 5 }], cards: [] })).toEqual([]);
  });

  it("contributions kosong -> tidak ada update (tidak menyentuh kartu apapun)", () => {
    expect(buildJahitCardSync({ contributions: [], cards: [{ id: "c1", qty: 5 }] })).toEqual([]);
  });
});
