import { describe, it, expect } from "vitest";
import {
  labelText,
  labelUrl,
  buildLabelRows,
  clampCopies,
  totalCopies,
  buildLabelJob,
  buildLabelJobEscPos,
  concatJobs,
  LABEL_W,
  LABEL_H,
  PRINTER_PROTOCOLS,
  DEFAULT_PROTOCOL,
  ESCPOS_PAPER_WIDTHS,
  DEFAULT_ESCPOS_PAPER_WIDTH,
  centerBitmapInWidth,
} from "./utils";

describe("cetak-label utils", () => {
  it("labelText: strip dash, huruf besar, tambah ukuran", () => {
    expect(labelText("D-59-DMD", "Midi")).toBe("D 59 DMD MIDI");
    expect(labelText("D-055-TEN", "Midi Jumbo")).toBe("D 055 TEN MIDI JUMBO");
  });
  it("labelUrl memakai jalur pendek /q/KODE", () => {
    expect(labelUrl("D-59-DMD")).toBe("https://deera.id/q/D-59-DMD");
  });
  it("buildLabelRows: default qty = produksi per ukuran", () => {
    expect(buildLabelRows({ Midi: 45, Gamis: "10" })).toEqual([
      { size: "Midi", produced: 45, qty: 45 },
      { size: "Gamis", produced: 10, qty: 10 },
    ]);
    expect(buildLabelRows(null)).toEqual([]);
  });
  it("clampCopies & totalCopies", () => {
    expect(clampCopies("12")).toBe(12);
    expect(clampCopies("-3")).toBe(0);
    expect(clampCopies("abc")).toBe(0);
    expect(clampCopies("99999")).toBe(999);
    expect(totalCopies([{ qty: 2 }, { qty: 3 }])).toBe(5);
  });
  it("buildLabelJob: SIZE 40x30, bitmap sekali, PRINT 1,N", () => {
    const bitmap = { widthBytes: 40, height: 240, bytes: new Uint8Array(40 * 240).fill(0xff) };
    const job = buildLabelJob(bitmap, 7);
    const text = new TextDecoder("latin1").decode(job);
    expect(text).toContain("SIZE 40 mm,30 mm");
    expect(text).toContain("BITMAP 0,0,40,240,0,");
    expect(text).toContain("PRINT 1,7");
    expect(LABEL_W / 8).toBe(40);
    expect(LABEL_H).toBe(240);
    expect(concatJobs([job, job]).length).toBe(job.length * 2);
  });
  it("PRINTER_PROTOCOLS: tspl & escpos tersedia, default tspl", () => {
    expect(Object.keys(PRINTER_PROTOCOLS)).toEqual(["tspl", "escpos"]);
    expect(DEFAULT_PROTOCOL).toBe("tspl");
  });
  it("buildLabelJobEscPos: kirim ulang raster yang sama N kali (tanpa PRINT 1,N spt TSPL)", () => {
    const bitmap = { widthBytes: 40, height: 240, bytes: new Uint8Array(40 * 240).fill(0xff) };
    const job3 = buildLabelJobEscPos(bitmap, 3);
    const job1 = buildLabelJobEscPos(bitmap, 1);
    expect(job3.length).toBe(job1.length * 3);
    expect(buildLabelJobEscPos(bitmap, 0).length).toBe(0);
  });
  // BUG FIX (November 2026, laporan admin: QR & teks kepisah ke label
  // fisik berbeda di mode "Label (gap paper)") -- satu bitmap label HARUS
  // dikirim sbg SATU blok raster "GS v 0" utuh (trim:false), bukan
  // dipecah jadi beberapa blok dgn feed buatan di tengahnya (bisa geser
  // dari gap fisik printer). Deteksi lewat hitung berapa kali header
  // "GS v 0" (0x1d,0x76,0x30,0x00) muncul di output.
  it("buildLabelJobEscPos: bitmap dgn baris kosong di tengah tetap dikirim SATU blok raster (trim dimatikan)", () => {
    const widthBytes = 1;
    const bytes = new Uint8Array(widthBytes * 20);
    bytes.fill(0xff, 0, 5); // 5 baris ber-"ink"
    bytes.fill(0x00, 5, 15); // 10 baris kosong di tengah (> minGapRows findBands)
    bytes.fill(0xff, 15, 20); // 5 baris ber-"ink" lagi
    const bitmap = { widthBytes, height: 20, bytes };
    const job = buildLabelJobEscPos(bitmap, 1);
    let count = 0;
    for (let i = 0; i + 3 < job.length; i++) {
      if (job[i] === 0x1d && job[i + 1] === 0x76 && job[i + 2] === 0x30 && job[i + 3] === 0x00)
        count++;
    }
    expect(count).toBe(1);
  });
  it("ESCPOS_PAPER_WIDTHS: 40mm = lebar label (320 dot), 80mm = 576 dot, default 40mm", () => {
    expect(ESCPOS_PAPER_WIDTHS["40"].dots).toBe(LABEL_W);
    expect(ESCPOS_PAPER_WIDTHS["80"].dots).toBe(576);
    expect(DEFAULT_ESCPOS_PAPER_WIDTH).toBe("40");
  });
  describe("centerBitmapInWidth", () => {
    it("kertas sama/lebih sempit dari bitmap -> dikembalikan apa adanya (tidak di-pad)", () => {
      const bitmap = { widthBytes: 40, height: 4, bytes: new Uint8Array(40 * 4).fill(0xff) };
      expect(centerBitmapInWidth(bitmap, 320)).toBe(bitmap);
      expect(centerBitmapInWidth(bitmap, 100)).toBe(bitmap);
    });
    it("kertas lebih lebar -> tambah kolom kosong (0x00) rata kiri-kanan, konten asli di tengah", () => {
      const bitmap = { widthBytes: 2, height: 1, bytes: new Uint8Array([0xff, 0xff]) };
      const padded = centerBitmapInWidth(bitmap, 32); // target 4 byte (32/8)
      expect(padded.widthBytes).toBe(4);
      expect(padded.height).toBe(1);
      expect(Array.from(padded.bytes)).toEqual([0x00, 0xff, 0xff, 0x00]);
    });
    it("multi-baris: tiap baris dipad dgn margin yang sama", () => {
      const bitmap = { widthBytes: 1, height: 2, bytes: new Uint8Array([0xaa, 0xbb]) };
      const padded = centerBitmapInWidth(bitmap, 24); // target 3 byte
      expect(Array.from(padded.bytes)).toEqual([0x00, 0xaa, 0x00, 0x00, 0xbb, 0x00]);
    });
  });
});
