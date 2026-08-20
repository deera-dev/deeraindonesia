import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: { nama: "DEERA", wa: "628111", rekening: [] },
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));
vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
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
    expect(previewTspl(saleMock, "gapped", "78")).toContain("GAP 3 mm");
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

  it("shows 'DEERA' brand + tagline", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"DEERA"');
    expect(text).toContain('"Graceful Elegance"');
  });

  it("highlights exactly 2 blocks with REVERSE (background hitam/teks putih): brand DEERA+tagline, dan Total — permintaan Denny", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const reverseLines = text.match(/^REVERSE .+$/gm) ?? [];
    expect(reverseLines.length).toBe(2);
  });

  it("REVERSE brand block muncul SETELAH TEXT DEERA/tagline (gambar teks dulu, baru invert)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    const deeraIdx = text.indexOf('"DEERA"');
    const taglineIdx = text.indexOf('"Graceful Elegance"');
    const firstReverseIdx = text.indexOf("REVERSE");
    expect(deeraIdx).toBeGreaterThan(-1);
    expect(taglineIdx).toBeGreaterThan(deeraIdx);
    expect(firstReverseIdx).toBeGreaterThan(taglineIdx);
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

  it("shows 'Yth.' then the uppercased buyer name", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Yth."');
    expect(text).toContain('"RIMBI BREBES"');
  });

  it("shows Staff and Lokasi on separate lines (bukan 1 baris spt desain lama)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Staff: DIKA"');
    expect(text).toContain('"Lokasi: Gudang"');
  });

  it("formats each item as '<n>. <kode> - <size>' and a qty x harga ... total row", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"1. D-22-KBR - MIDI"');
    expect(text).toContain('"2. D-010-ZUR - GAMIS"');
    expect(text).toContain("4 pcs x Rp 220000");
    expect(text).toContain("Rp 880000"); // 4 * 220000
  });

  it("puts the per-item qty×harga line and its total on 2 SEPARATE TEXT y-positions (bukan 1 baris) — supaya tidak pernah tabrakan di font besar", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    // ym=3 (TEXT_YM_ITEM) — info item dibuat lebih besar dari teks umum
    // (ym=2) supaya paling menonjol/kebaca jelas, permintaan Denny 2026-08.
    const qtyMatch = text.match(/TEXT (\d+),(\d+),"3",0,1,3,"   4 pcs x Rp 220000"/);
    const totalMatch = text.match(/TEXT (\d+),(\d+),"4",0,1,3,"Rp 880000"/);
    expect(qtyMatch).not.toBeNull();
    expect(totalMatch).not.toBeNull();
    expect(Number(qtyMatch[2])).not.toBe(Number(totalMatch[2]));
  });

  it("renders the buyer name at ym=3 (TEXT_YM_ITEM) — lebih besar dari teks umum supaya nama pembeli jelas kebaca", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,3,"RIMBI BREBES"/);
  });

  it("renders the item kode-ukuran line at ym=3 (TEXT_YM_ITEM)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,3,"1\. D-22-KBR - MIDI"/);
  });

  it("renders the grand Total at ym=4 (TEXT_YM_TOTAL) — satu tingkat lebih besar dari item, tetap paling menonjol", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,4,"Total"/);
    expect(text).toMatch(/TEXT (\d+),(\d+),"4",0,1,4,"Rp 3130000"/);
  });

  it("shows 'Total' (title case, not 'TOTAL') with the grand total", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Total"');
    expect(text).toContain("Rp 3130000");
  });

  it("shows one bank block per rekening entry, WITHOUT a standalone 'Transfer' label (dihapus, permintaan Denny — dulu terlihat tidak rapi)", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).not.toContain("- TRANSFER -");
    expect(text).not.toContain('"Transfer"');
    expect(text).toContain('"BCA"');
    expect(text).toContain('"2060425542"');
    expect(text).toContain('"a.n. Siti Asiyah"');
    expect(text).toContain('"7145047978"');
    expect(text).toContain('"a.n. Wulan Nur Oktafiani"');
  });

  it("shows WA line", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain("WA: +62811947254");
  });

  it("wraps the long footer sentence into multiple TEXT lines instead of overflowing", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    // Kalimat lengkap tidak boleh muncul utuh di satu baris (kepanjangan utk
    // kertas 78mm) — tapi potongan kata kunci di awal & akhir harus ada.
    expect(text).not.toContain("Kunjungi website untuk melihat katalog lengkap kami: deera.id");
    expect(text).toContain("Kunjungi");
    expect(text).toContain("deera.id");
  });

  it("ends with the thank-you message", () => {
    setupFullStoreInfo();
    const text = previewTspl(fullSale, "continuous", "78");
    expect(text).toContain('"Terima kasih telah berbelanja!"');
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
