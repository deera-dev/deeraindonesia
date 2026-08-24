import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: { nama: "DEERA", wa: "628111", rekening: [] },
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));
vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: vi.fn((n) => String(n)),
}));

import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { useTsplPrinter, LABEL_TYPES, PAPER_WIDTHS, previewTspl } from "./useTsplPrinter";

const saleMock = {
  buyer_name: "BUDI",
  date: "2026-07-04",
  type: "sale",
  location: "gudang",
  total: 100000,
  discount: 0,
  items: [{ kode: "D-01", size: "Midi", qty: 1, harga: 100000 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete navigator.bluetooth;
});

describe("LABEL_TYPES", () => {
  it("has continuous and gapped types", () => {
    expect(LABEL_TYPES.continuous).toBeDefined();
    expect(LABEL_TYPES.gapped).toBeDefined();
  });

  it("continuous has gapMm=0", () => {
    expect(LABEL_TYPES.continuous.gapMm).toBe(0);
  });
});

describe("PAPER_WIDTHS", () => {
  it("has 100 and 78 mm options", () => {
    expect(PAPER_WIDTHS[100]).toBeDefined();
    expect(PAPER_WIDTHS[78]).toBeDefined();
  });

  // 300dpi sempat dicoba (921/1181 dots) tapi DI-REVERT — tes cetak fisik
  // Denny 2026-08 membuktikan konten jadi TERPOTONG/rusak di printer
  // sungguhan (bukti kuat printer fisiknya memang 203dpi). Balik ke 623/800.
  it("100mm keeps the original dot count (800) unchanged", () => {
    expect(PAPER_WIDTHS[100].dots).toBe(800);
  });

  it("78mm uses 623 dots (round(78 * 203/25.4))", () => {
    expect(PAPER_WIDTHS[78].dots).toBe(623);
  });
});

describe("previewTspl", () => {
  it("returns a string (not bytes) containing the TSPL commands", () => {
    const text = previewTspl(saleMock, "continuous", "78");
    expect(typeof text).toBe("string");
    expect(text).toContain("SIZE 78 mm");
    expect(text).toContain("PRINT 1,1");
  });

  it("does NOT touch navigator.bluetooth at all (pure text, no BLE)", () => {
    expect(navigator.bluetooth).toBeUndefined();
    previewTspl(saleMock, "continuous", "78");
    expect(navigator.bluetooth).toBeUndefined();
  });

  it("reflects the chosen paper width in the SIZE header", () => {
    expect(previewTspl(saleMock, "continuous", "78")).toContain("SIZE 78 mm");
    expect(previewTspl(saleMock, "continuous", "100")).toContain("SIZE 100 mm");
  });

  it("reflects gapMm from labelType in the GAP header", () => {
    expect(previewTspl(saleMock, "continuous", "78")).toContain("GAP 0 mm");
    // gapMm=2 (dikonfirmasi Denny 2026-08, sesuai kertas fisik 100×150mm
    // gap 2mm — dulu ditebak 3mm, salah).
    expect(previewTspl(saleMock, "gapped", "78")).toContain("GAP 2 mm");
  });

  it("uses a FIXED height (150mm) for 'gapped' paper, NOT computed from content length — supaya titik potong cetakan sinkron dgn gap fisik kertas 100×150mm Denny", () => {
    expect(previewTspl(saleMock, "gapped", "78")).toContain("SIZE 78 mm,150 mm");
  });

  it("still computes height DYNAMICALLY from content for 'continuous' paper (behavior lama tidak berubah)", () => {
    const text = previewTspl(saleMock, "continuous", "78");
    expect(text).not.toContain(",150 mm");
    expect(text).toMatch(/SIZE 78 mm,\d+ mm/);
  });

  it("defaults to 78mm when paperWidthMm is omitted", () => {
    expect(previewTspl(saleMock, "continuous")).toContain("SIZE 78 mm");
  });

  it("does not throw and returns a fallback comment string on bad input", () => {
    const text = previewTspl(null);
    expect(typeof text).toBe("string");
  });
});

describe("generateTsplString layout — 'Versi B' redesign 2026-08 (via previewTspl)", () => {
  const fullSale = {
    buyer_name: "Rimbi Brebes",
    created_at: "2026-08-13T23:42:00",
    created_by_name: "Dika",
    type: "sale",
    location: "gudang",
    total: 3130000,
    discount: 0,
    items: [
      { kode: "D-22-KBR", size: "Midi", qty: 4, harga: 220000 },
      { kode: "D-010-ZUR", size: "Gamis", qty: 5, harga: 230000 },
    ],
  };

  // STORE_INFO adalah objek yang di-mock — dimutasi sementara per test lalu
  // dikembalikan di afterEach supaya tidak bocor ke test lain di file ini.
  const originalStoreInfo = { ...STORE_INFO };
  afterEach(() => {
    Object.keys(STORE_INFO).forEach((k) => delete STORE_INFO[k]);
    Object.assign(STORE_INFO, originalStoreInfo);
  });

  function setupFullStoreInfo() {
    Object.assign(STORE_INFO, {
      nama: "DEERA",
      tagline: "Graceful Elegance",
      wa: "+62811947254",
      website: "deera.id",
      instagram: "@deeraindonesia",
      rekening: [
        { bank: "BCA", no: "2060425542", atas_nama: "Siti Asiyah" },
        { bank: "BCA", no: "7145047978", atas_nama: "Wulan Nur Oktafiani" },
      ],
    });
  }

  it("leaves top margin before the title (bukan y=0) supaya tidak mepet kalau cetakan terpotong", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const m = text.match(/TEXT (\d+),(\d+),"4",0,1,2,"Struk Pembelian"/);
    expect(m).not.toBeNull();
    expect(Number(m[2])).toBeGreaterThan(0);
  });

  it("starts with 'Struk Pembelian' title then the formatted date (D Bulan YYYY, HH:mm WIB)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const titleIdx = text.indexOf('"Struk Pembelian"');
    const dateIdx = text.indexOf("13 Agustus 2026, 23:42 WIB");
    expect(titleIdx).toBeGreaterThan(-1);
    expect(dateIdx).toBeGreaterThan(-1);
    expect(titleIdx).toBeLessThan(dateIdx);
  });

  it("shows 'Struk Retur' + 'Total Retur' for retur sales", () => {
    setupFullStoreInfo();
    const text = previewTspl({ ...fullSale, type: "retur" }, "continuous", "78");
    expect(text).toContain('"Struk Retur"');
    expect(text).toContain('"Total Retur"');
  });

  it("mencetak 'DEERA' polos (BUKAN letter-spaced 'D E E R A', BUKAN bitmap logo asli) di font BESAR ('4', ym=TEXT_YM_TOTAL=3) — permintaan Denny 2026-08 lanjutan 'DEERA aja tapi besar dan tanpa background hitam juga', simplifikasi lebih lanjut dari desain teks+bingkai sebelumnya", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"DEERA"');
    expect(text).not.toContain('"D E E R A"'); // TIDAK letter-spaced lagi
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,3,"DEERA"/); // ym=3 = besar
    expect(text).not.toContain("BITMAP 0,"); // brand section TIDAK ada BITMAP sama sekali
  });

  it("TIDAK menampilkan tagline 'Graceful Elegance' lagi (dihapus bersama background hitam, permintaan Denny)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).not.toContain('"Graceful Elegance"');
  });

  it("TIDAK ada garis ornamen atau bingkai emblem (BAR) di sekitar 'DEERA' — brand section sekarang cuma 1 baris TEXT polos, tanpa dekorasi (satu2nya BAR di antara title & DEERA adalah divider tipis standar di bawah tanggal, BUKAN ornamen/bingkai brand)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const brandIdx = text.indexOf('"DEERA"');
    const titleIdx = text.indexOf('"Struk Pembelian"');
    expect(brandIdx).toBeGreaterThan(-1);
    const between = text.slice(titleIdx, brandIdx);
    const bars = between.match(/^BAR .+$/gm) ?? [];
    expect(bars.length).toBe(1); // cuma divider standar (tLine di bawah tanggal)
  });

  it("highlights EXACTLY 1 blok dengan REVERSE (background hitam/teks putih): HANYA Total — brand 'DEERA' sudah TIDAK pakai background hitam lagi (permintaan Denny 2026-08 'tanpa background hitam juga')", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const reverseLines = text.match(/^REVERSE .+$/gm) ?? [];
    expect(reverseLines.length).toBe(1);
  });

  it("REVERSE Total block muncul SETELAH TEXT 'Total' (gambar teks dulu, baru invert)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const totalIdx = text.indexOf('"Total"');
    const reverseLines = [...text.matchAll(/^REVERSE .+$/gm)];
    const lastReverseIdx = text.lastIndexOf(reverseLines[reverseLines.length - 1][0]);
    expect(totalIdx).toBeGreaterThan(-1);
    expect(lastReverseIdx).toBeGreaterThan(totalIdx);
  });

  it("shows 'Yth.' then the uppercased buyer name, on the SAME line (redesign padat 2026-08, dulu 2 baris)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Yth."');
    expect(text).toContain('"RIMBI BREBES"');
    // Cek keduanya benar2 di baris (y) yang SAMA — 1 baris, bukan 2.
    const yth = text.match(/TEXT (\d+),(\d+),"3",0,1,\d,"Yth\."/);
    const nama = text.match(/TEXT (\d+),(\d+),"4",0,1,\d,"RIMBI BREBES"/);
    expect(yth).not.toBeNull();
    expect(nama).not.toBeNull();
    expect(yth[2]).toBe(nama[2]);
  });

  it("does NOT show a 'Yth.' line at all when buyer_name is empty (dulu tetap tampil 'Yth.' kosong, buang 1 baris)", () => {
    setupFullStoreInfo();
    const text = previewTspl({ ...fullSale, buyer_name: "" }, "continuous", "78");
    expect(text).not.toContain('"Yth."');
  });

  it("shows Staff and Lokasi with explicit labels on ONE line (permintaan Denny 2026-08 lanjutan — dulu nilai polos tanpa label), separated by ' - ' (bukan '·' — glyph itu tidak ada di font bawaan printer, tercetak garbled di kertas fisik)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Staff: DIKA  -  Lokasi: Gudang"');
    expect(text).not.toContain("·");
  });

  it("renders Staff/Lokasi at the SMALLEST font ('2', ym=1) — SENGAJA lebih kecil dari baris nama pembeli (font '4'), supaya nama pembeli tetap yang paling menonjol", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"2",0,1,1,"Staff: DIKA {2}- {2}Lokasi: Gudang"/);
  });

  it("formats each item as '<n>. <kode> - <size>' and a qty x harga ... total row", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"1. D-22-KBR - MIDI"');
    expect(text).toContain('"2. D-010-ZUR - GAMIS"');
    expect(text).toContain("4 pcs x Rp 220000");
    expect(text).toContain("Rp 880000"); // 4 * 220000
  });

  // ── Harga per-item: gaya "space-between" (qty×harga kiri, total kanan,
  // spt CSS justify-content:space-between — permintaan Denny 2026-08
  // lanjutan "supaya space kosong bisa terisi"). qty×harga font "3" —
  // UKURAN ASLI, TIDAK dikecilkan (sempat dicoba font "2" tapi itu bukan
  // akar masalahnya — akar masalahnya FONT.w yg salah kalibrasi, lihat
  // catatan kalibrasi di atas file: setelah lebar font dikoreksi dari
  // pengukuran fisik [penggaris, "Rp 1.840.000" = ~19mm bukan ~36mm], font
  // "3" pun muat nyaman 1 baris tanpa perlu dikecilkan). Total tetap besar
  // & menonjol di font "4". fitsOneRow() tetap WAJIB sbg pengaman, bukan
  // opsional — digabung paksa tanpa cek lebar terbukti bisa tabrakan di
  // kertas fisik.
  it("combines qty×harga + total on the SAME line (1 baris, y sama, gaya space-between) when it fits within the paper width", () => {
    setupFullStoreInfo();
    // formatHarga di-mock jadi String(n) polos (tanpa titik ribuan) di file
    // test ini — teksnya jadi cukup pendek utk muat 1 baris di 78mm.
    const text = previewTspl(fullSale, "continuous", "78");
    const qtyMatch = text.match(/TEXT (\d+),(\d+),"3",0,1,2,"   4 pcs x Rp 220000"/);
    const totalMatch = text.match(/TEXT (\d+),(\d+),"4",0,1,2,"Rp 880000"/);
    expect(qtyMatch).not.toBeNull();
    expect(totalMatch).not.toBeNull();
    expect(qtyMatch[2]).toBe(totalMatch[2]); // y SAMA = 1 baris
  });

  it("combines EVEN with realistic thousand-separator prices (data asli struk fisik Denny 2026-08: qty 8 × Rp 230.000) di UKURAN FONT ASLI ('3', tidak dikecilkan) — muat 1 baris berkat kalibrasi FONT.w yg benar", async () => {
    setupFullStoreInfo();
    const { formatHarga } = await import("@deera/shared/lib/constants");
    formatHarga.mockImplementation((n) => new Intl.NumberFormat("id-ID").format(n));
    const bigSale = {
      ...fullSale,
      items: [{ kode: "D-012-ZUR", size: "Midi", qty: 8, harga: 230000 }],
    };
    const text = previewTspl(bigSale, "continuous", "78");
    const qtyMatch = text.match(/TEXT (\d+),(\d+),"3",0,1,2,"   8 pcs x Rp 230\.000"/);
    const totalMatch = text.match(/TEXT (\d+),(\d+),"4",0,1,2,"Rp 1\.840\.000"/);
    expect(qtyMatch).not.toBeNull();
    expect(totalMatch).not.toBeNull();
    expect(qtyMatch[2]).toBe(totalMatch[2]); // y SAMA = 1 baris
    formatHarga.mockImplementation((n) => String(n)); // restore utk test lain
  });

  it("all item totals + grand Total end at the EXACT SAME right x (flush-right/space-between konsisten, permintaan Denny 2026-08 lanjutan) regardless of digit count", async () => {
    setupFullStoreInfo();
    const { formatHarga } = await import("@deera/shared/lib/constants");
    formatHarga.mockImplementation((n) => new Intl.NumberFormat("id-ID").format(n));
    const bigSale = {
      ...fullSale,
      items: [
        { kode: "D-012-ZUR", size: "Midi", qty: 8, harga: 230000 }, // "Rp 1.840.000" (12 char)
        { kode: "D-024-HMS", size: "Midi", qty: 3, harga: 220000 }, // "Rp 660.000" (10 char, LEBIH PENDEK)
      ],
    };
    const text = previewTspl(bigSale, "continuous", "78");
    const total1 = text.match(/TEXT (\d+),(\d+),"4",0,1,2,"Rp 1\.840\.000"/);
    const total2 = text.match(/TEXT (\d+),(\d+),"4",0,1,2,"Rp 660\.000"/);
    expect(total1).not.toBeNull();
    expect(total2).not.toBeNull();
    // x BEDA (start position beda krn panjang teks beda) TAPI endX (x + lebar
    // teks) harus SAMA PERSIS — itulah "flush-right" yg sesungguhnya.
    const FONT4_W = 13;
    const end1 = Number(total1[1]) + FONT4_W * "Rp 1.840.000".length;
    const end2 = Number(total2[1]) + FONT4_W * "Rp 660.000".length;
    expect(end1).toBe(end2);
    formatHarga.mockImplementation((n) => String(n)); // restore utk test lain
  });

  it("falls back to 2 SEPARATE lines when qty×harga + total would STILL collide (qty+harga SENGAJA ekstrem/sintetis murni utk membuktikan mekanisme fallback masih berfungsi, bukan skenario nyata — dgn FONT.w yg sudah dikalibrasi ulang, perlu nominal JAUH lebih ekstrem drpd sebelumnya utk memicu overflow)", async () => {
    setupFullStoreInfo();
    const { formatHarga } = await import("@deera/shared/lib/constants");
    formatHarga.mockImplementation((n) => new Intl.NumberFormat("id-ID").format(n));
    const bigSale = {
      ...fullSale,
      items: [{ kode: "D-012-ZUR", size: "Midi", qty: 999999999999999, harga: 9 }],
    };
    const text = previewTspl(bigSale, "continuous", "78");
    const qtyMatch = text.match(/TEXT (\d+),(\d+),"3",0,1,2,"   999999999999999 pcs x Rp 9"/);
    const totalMatch = text.match(/TEXT (\d+),(\d+),"4",0,1,2,"Rp 8\.999\.999\.999\.999\.991"/);
    expect(qtyMatch).not.toBeNull();
    expect(totalMatch).not.toBeNull();
    expect(qtyMatch[2]).not.toBe(totalMatch[2]); // y BEDA = fallback 2 baris
    formatHarga.mockImplementation((n) => String(n)); // restore utk test lain
  });

  it("renders the buyer name at ym=2 (TEXT_YM_ITEM, sama dgn teks umum — sempat ym=3 tapi kebesaran pas dicetak)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,2,"RIMBI BREBES"/);
  });

  it("renders the item kode-ukuran line at ym=2 (TEXT_YM_ITEM)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,2,"1\. D-22-KBR - MIDI"/);
  });

  it("renders the grand Total at ym=3 (TEXT_YM_TOTAL) — satu tingkat lebih besar dari teks umum, tetap paling menonjol (dibantu highlight REVERSE), tapi tidak lagi ym=4 yg kebesaran pas dicetak", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,3,"Total"/);
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,3,"Rp 3130000"/);
  });

  it("shows 'Total' (title case, not 'TOTAL') with the grand total", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Total"');
    expect(text).toContain("Rp 3130000");
  });

  it("lays out 2 rekening as a 2-COLUMN grid — baris atas: no rekening kiri & kanan sejajar; baris bawah: nama pemilik kiri & kanan sejajar (persis di bawah no rekening masing2, TIDAK ambigu) — dgn garis vertikal pemisah di tengah (permintaan Denny 2026-08 lanjutan: '2 baris, tapi 2 kolom dengan batas dibagian tengahnya'), WITHOUT a standalone 'Transfer' label", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).not.toContain("- TRANSFER -");
    expect(text).not.toContain('"Transfer"');
    const bca1 = text.match(/TEXT (\d+),(\d+),"3",0,1,2,"BCA 2060425542"/);
    const bca2 = text.match(/TEXT (\d+),(\d+),"3",0,1,2,"BCA 7145047978"/);
    const nama1 = text.match(/TEXT (\d+),(\d+),"2",0,1,2,"a\.n\. Siti Asiyah"/);
    const nama2 = text.match(/TEXT (\d+),(\d+),"2",0,1,2,"a\.n\. Wulan Nur Oktafiani"/);
    expect(bca1).not.toBeNull();
    expect(bca2).not.toBeNull();
    expect(nama1).not.toBeNull();
    expect(nama2).not.toBeNull();
    expect(bca1[2]).toBe(bca2[2]); // baris NO: kedua rekening di y yg sama (sejajar horizontal)
    expect(nama1[2]).toBe(nama2[2]); // baris NAMA: kedua nama di y yg sama (sejajar horizontal)
    expect(Number(nama1[2])).toBeGreaterThan(Number(bca1[2])); // baris nama di BAWAH baris no
    expect(Number(bca1[1])).toBeLessThan(Number(bca2[1])); // rekening #1 kolom KIRI, #2 kolom KANAN
    expect(Number(nama1[1])).toBeLessThan(Number(nama2[1])); // nama #1 kolom KIRI, #2 kolom KANAN
    // Garis vertikal pemisah (BAR dgn w kecil, h besar) di antara kedua kolom.
    const vBars = [...text.matchAll(/^BAR (\d+),(\d+),(\d+),(\d+)$/gm)].filter(
      (m) => Number(m[3]) < Number(m[4]),
    );
    expect(vBars.length).toBeGreaterThan(0);
  });

  it("footer cuma 'WA {nomor}' saja, TANPA website (website sudah tampil di section ajakan 'Kunjungi website' sebelum footer, jadi tidak dobel)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"WA +62811947254"');
    expect(text).not.toContain('"WA +62811947254  -  deera.id"');
    expect(text).not.toContain("·");
  });

  describe("Ajakan lihat katalog — TEKS POLOS, TANPA QR barcode (permintaan Denny 2026-08 lanjutan 'gausah pake barcode deh, text aja, kunjungi website deera.id buat lihat katalog lengkap, terus instagram @deeraindonesia, whatsapp, sama terimakasih aja')", () => {
    it("TIDAK ADA bitmap/BITMAP sama sekali di seluruh struk — QR barcode SUDAH DIHAPUS TOTAL", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      expect(text).not.toContain("BITMAP");
    });

    it("menampilkan ajakan 'Kunjungi website' + nilai STORE_INFO.website ('deera.id') sbg baris terpisah, lalu 'untuk lihat katalog lengkap' DIPECAH jadi 2 baris ('untuk lihat' / 'katalog lengkap', permintaan Denny 2026-08 lanjutan 'dibuat 2 baris aja')", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      const kunjungiIdx = text.indexOf('"Kunjungi website"');
      const websiteIdx = text.indexOf('"deera.id"');
      const untukIdx = text.indexOf('"untuk lihat"');
      const katalogIdx = text.indexOf('"katalog lengkap"');
      expect(kunjungiIdx).toBeGreaterThan(-1);
      expect(websiteIdx).toBeGreaterThan(kunjungiIdx);
      expect(untukIdx).toBeGreaterThan(websiteIdx);
      expect(katalogIdx).toBeGreaterThan(untukIdx);
      // TIDAK digabung 1 baris lagi.
      expect(text).not.toContain('"untuk lihat katalog lengkap"');
      // TIDAK ada lagi kalimat "www." di depan website (dulu dipakai di
      // section QR, sekarang website dicetak polos apa adanya).
      expect(text).not.toContain('"www.deera.id"');
    });

    it("'Kunjungi website' pakai font YANG SAMA (font '2', ym=1) dgn 'untuk lihat'/'katalog lengkap' — permintaan Denny 2026-08 lanjutan 'dibuat sama aja sizenya' (dulu font '3'/ym=2, lebih besar)", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      const kunjungi = text.match(/TEXT (\d+),(\d+),"(\d)",0,1,(\d),"Kunjungi website"/);
      const untuk = text.match(/TEXT (\d+),(\d+),"(\d)",0,1,(\d),"untuk lihat"/);
      expect(kunjungi).not.toBeNull();
      expect(untuk).not.toBeNull();
      expect(kunjungi[3]).toBe(untuk[3]); // font sama
      expect(kunjungi[4]).toBe(untuk[4]); // ym sama
      expect(kunjungi[3]).toBe("2");
      expect(kunjungi[4]).toBe("1");
    });

    it("menampilkan instagram (STORE_INFO.instagram) SETELAH ajakan website", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      const katalogIdx = text.indexOf('"katalog lengkap"');
      const igIdx = text.indexOf('"@deeraindonesia"');
      expect(igIdx).toBeGreaterThan(katalogIdx);
    });

    it("padding atas & bawah blok ajakan SEKARANG SIMETRIS (AJAKAN_PAD=10 dot di kedua sisi) supaya benar2 center antar divider — permintaan Denny 2026-08 lanjutan 'bagian ini masih tidak center'", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      // Gap normal antar 2 baris teks font "2"/ym=1 (baseline pembanding) —
      // pakai jarak 'untuk lihat' → 'katalog lengkap'.
      const untuk = text.match(/TEXT (\d+),(\d+),"2",0,1,1,"untuk lihat"/);
      const katalog = text.match(/TEXT (\d+),(\d+),"2",0,1,1,"katalog lengkap"/);
      const ig = text.match(/TEXT (\d+),(\d+),"2",0,1,1,"@deeraindonesia"/);
      expect(untuk).not.toBeNull();
      expect(katalog).not.toBeNull();
      expect(ig).not.toBeNull();
      const normalLineGap = Number(katalog[2]) - Number(untuk[2]);
      // Gap SETELAH baris instagram (baris terakhir blok ini) sampai divider
      // penutup — dicari via divider (BAR) pertama setelah baris instagram.
      const igIdx = text.indexOf(ig[0]);
      const dividerMatch = text.slice(igIdx).match(/^BAR (\d+),(\d+),(\d+),(\d+)$/m);
      expect(dividerMatch).not.toBeNull();
      const gapAfterIg = Number(dividerMatch[2]) - Number(ig[2]);
      // Gap ini HARUS lebih besar dari gap normal antar baris (LINE_PAD=2
      // biasa), membuktikan AJAKAN_PAD (10) benar2 dipakai, bukan cuma
      // LINE_PAD default.
      expect(gapAfterIg).toBeGreaterThan(normalLineGap);
    });

    it("section ajakan muncul SETELAH blok rekening/transfer & SEBELUM footer WA (Total → Transfer → Ajakan website/IG → WA → Footer)", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      const rekeningIdx = text.indexOf('"BCA 2060425542"');
      const kunjungiIdx = text.indexOf('"Kunjungi website"');
      const footerWaIdx = text.indexOf('"WA +62811947254"');
      expect(rekeningIdx).toBeGreaterThan(-1);
      expect(kunjungiIdx).toBeGreaterThan(rekeningIdx);
      expect(footerWaIdx).toBeGreaterThan(kunjungiIdx);
    });

    it("TIDAK pakai REVERSE atau BAR background sama sekali DI DALAM section ajakan itu sendiri (teks polos murni) — hanya 1 BAR standar (divider penutup section, sama spt di section lain) yg boleh muncul SETELAH baris instagram", () => {
      setupFullStoreInfo();
      const text = previewTspl(fullSale, "continuous", "78");
      const kunjungiIdx = text.indexOf('"Kunjungi website"');
      const igIdx = text.indexOf('"@deeraindonesia"');
      const footerWaIdx = text.indexOf('"WA +62811947254"');
      // TIDAK ada REVERSE/BAR sama sekali di ANTARA baris2 teks section ini
      // (dari ajakan sampai baris instagram).
      const insideBlock = text.slice(kunjungiIdx, igIdx);
      expect(insideBlock).not.toContain("REVERSE");
      expect(insideBlock).not.toMatch(/^BAR /m);
      // Setelah baris instagram sampai footer WA, HANYA boleh ada 1 BAR
      // (divider penutup standar, sama spt tiap section lain di struk).
      const afterBlock = text.slice(igIdx, footerWaIdx);
      const bars = afterBlock.match(/^BAR .+$/gm) ?? [];
      expect(bars.length).toBe(1);
      expect(afterBlock).not.toContain("REVERSE");
    });
  });

  it("ends with the thank-you message", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Terima kasih telah berbelanja!"');
  });

  // ── Regresi "2-3 halaman terputus berantakan" (keluhan Denny 2026-08) ────
  // Kertas fisik "gapped" Denny: 100×150mm per label, gap 2mm. Kalau struk
  // (mis. banyak item) lebih panjang dari 1 label, HARUS di-split otomatis
  // jadi beberapa blok SIZE/GAP/CLS/…/PRINT terpisah — bukan 1 PRINT job
  // raksasa dgn SIZE height > 150mm (itu penyebab lama masalahnya).
  describe("Multi-halaman utk kertas 'gapped' saat konten > 1 label (150mm)", () => {
    const bigSale = {
      ...fullSale,
      // harga SENGAJA dibuat unik per item (100000 + i*1000) supaya baris
      // total "Rp xxx" tidak ada yang kembar — kalau kembar, pencarian
      // "item ini ada di halaman mana" di bawah jadi ambigu/salah cocok.
      items: Array.from({ length: 10 }, (_, i) => ({
        kode: `D-${i + 1}`,
        size: "Midi",
        qty: 1,
        harga: 100000 + i * 1000,
      })),
    };

    it("splits into MULTIPLE SIZE/GAP/CLS/…/PRINT blocks when content overflows 1 label", () => {
      setupFullStoreInfo();
      const text = previewTspl(bigSale, "gapped", "78");
      const printCount = (text.match(/^PRINT 1,1$/gm) ?? []).length;
      expect(printCount).toBeGreaterThan(1);
    });

    it("every page uses the SAME fixed SIZE (78 mm,150 mm) — never dihitung dari panjang konten", () => {
      setupFullStoreInfo();
      const text = previewTspl(bigSale, "gapped", "78");
      const sizeLines = text.match(/^SIZE .+$/gm) ?? [];
      expect(sizeLines.length).toBeGreaterThan(1);
      for (const line of sizeLines) {
        expect(line).toBe("SIZE 78 mm,150 mm");
      }
    });

    it("never splits a single item's kode-ukuran line and its Rp total across 2 different pages", () => {
      setupFullStoreInfo();
      const text = previewTspl(bigSale, "gapped", "78");
      // Pecah jadi blok per-halaman (dipisah oleh "PRINT 1,1").
      const blocks = text.split(/PRINT 1,1\r?\n/).filter((b) => b.trim());
      bigSale.items.forEach((item, i) => {
        const kodeLine = `"${i + 1}. ${item.kode} - MIDI"`;
        const totalLine = `"Rp ${item.qty * item.harga}"`;
        const blockWithKode = blocks.findIndex((b) => b.includes(kodeLine));
        const blockWithTotal = blocks.findIndex((b) => b.includes(totalLine));
        expect(blockWithKode).toBeGreaterThanOrEqual(0);
        expect(blockWithKode).toBe(blockWithTotal);
      });
    });

    it("does NOT split for 'continuous' paper with the same big sale — tetap 1 halaman, height dinamis (perilaku lama tidak berubah)", () => {
      setupFullStoreInfo();
      const text = previewTspl(bigSale, "continuous", "78");
      const printCount = (text.match(/^PRINT 1,1$/gm) ?? []).length;
      expect(printCount).toBe(1);
      const sizeLines = text.match(/^SIZE .+$/gm) ?? [];
      expect(sizeLines.length).toBe(1);
      expect(sizeLines[0]).not.toBe("SIZE 78 mm,150 mm");
    });

    it("small sale (fits in 1 label) still produces exactly 1 page for 'gapped' — tidak dipaksa split kalau tidak perlu", () => {
      // Sengaja PAKAI saleMock (1 item, tanpa rekening/tagline/website dari
      // setupFullStoreInfo) — fullSale dgn rekening+footer lengkap ternyata
      // SUDAH > 150mm dgn cuma 2 item (itulah kenapa Denny lihat halaman
      // terpotong di 78mm/gapped bahkan utk struk pendek) — jadi tidak valid
      // dipakai sbg kasus "pasti muat 1 label".
      const text = previewTspl(saleMock, "gapped", "78");
      const printCount = (text.match(/^PRINT 1,1$/gm) ?? []).length;
      expect(printCount).toBe(1);
    });
  });
});

describe("useTsplPrinter", () => {
  it("initializes with busy=false and error=null", () => {
    const { result } = renderHook(() => useTsplPrinter());
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns printBle function", () => {
    const { result } = renderHook(() => useTsplPrinter());
    expect(typeof result.current.printBle).toBe("function");
  });

  it("returns clearError function", () => {
    const { result } = renderHook(() => useTsplPrinter());
    expect(typeof result.current.clearError).toBe("function");
  });

  it("sets error when bluetooth not available", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printBle(saleMock, "continuous");
    });
    expect(result.current.error).toContain("Web Bluetooth");
  });

  it("accepts an explicit paperWidthMm argument without throwing", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    let ret;
    await act(async () => {
      ret = await result.current.printBle(saleMock, "continuous", "78");
    });
    // Bluetooth tetap tidak tersedia di jsdom — cukup pastikan tidak crash
    // dan tetap mengembalikan false seperti perilaku default (100mm) lama.
    expect(ret).toBe(false);
  });

  it("returns false when bluetooth not available", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    let ret;
    await act(async () => {
      ret = await result.current.printBle(saleMock, "continuous");
    });
    expect(ret).toBe(false);
  });

  it("clearError resets error to null", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printBle(saleMock);
    });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("sets busy=false after printBle completes", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printBle(saleMock);
    });
    expect(result.current.busy).toBe(false);
  });

  it("returns false when NotFoundError thrown by bluetooth", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      value: {
        requestDevice: vi.fn().mockRejectedValue(Object.assign(new Error("User cancelled"), { name: "NotFoundError" })),
      },
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useTsplPrinter());
    let ret;
    await act(async () => {
      ret = await result.current.printBle(saleMock, "continuous");
    });
    expect(ret).toBe(false);
    expect(result.current.error).toBeNull(); // NotFoundError doesn't set error
    delete navigator.bluetooth;
  });
});
