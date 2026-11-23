import { describe, it, expect, vi, beforeEach } from "vitest";

const writeBleFast = vi.fn().mockResolvedValue();
const disconnectPrinter = vi.fn();
const scheduleIdleDisconnect = vi.fn();
vi.mock("@deera/shared/lib/blePrinter", () => ({
  writeBleFast: (...a) => writeBleFast(...a),
  bleConnect: vi.fn().mockResolvedValue({ char: {} }),
  scheduleIdleDisconnect: (...a) => scheduleIdleDisconnect(...a),
  disconnectPrinter: (...a) => disconnectPrinter(...a),
}));
function opaqueBlackImage(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = 255; // alpha opaque, RGB tetap 0 (hitam)
  return data;
}
vi.mock("./render", () => ({
  labelGray: async () => ({ data: opaqueBlackImage(320, 240), w: 320, h: 240 }),
}));
import { printLabels } from "./print";

describe("printLabels", () => {
  beforeEach(() => {
    writeBleFast.mockClear();
    disconnectPrinter.mockClear();
    scheduleIdleDisconnect.mockClear();
    Object.defineProperty(navigator, "bluetooth", { value: {}, configurable: true });
  });
  it("mengirim satu job per ukuran ber-qty > 0 (default TSPL)", async () => {
    await printLabels([
      { kode: "D-1", size: "Midi", qty: 3 },
      { kode: "D-1", size: "Gamis", qty: 0 },
    ]);
    expect(writeBleFast).toHaveBeenCalledTimes(1);
    const text = new TextDecoder("latin1").decode(writeBleFast.mock.calls[0][1]);
    expect(text.match(/SIZE 40 mm,30 mm/g)).toHaveLength(1);
    expect(text).toContain("PRINT 1,3");
    expect(scheduleIdleDisconnect).toHaveBeenCalledTimes(1);
    expect(disconnectPrinter).not.toHaveBeenCalled();
  });
  it("menolak bila semua jumlah 0", async () => {
    await expect(printLabels([{ kode: "D-1", size: "Midi", qty: 0 }])).rejects.toThrow("masih 0");
  });
  it("menolak tanpa Web Bluetooth", async () => {
    Object.defineProperty(navigator, "bluetooth", { value: undefined, configurable: true });
    await expect(printLabels([{ kode: "D-1", size: "Midi", qty: 1 }])).rejects.toThrow("Bluetooth");
  });
  it("protocol escpos: kirim raster N kali (tanpa SIZE/PRINT TSPL), disconnect setelah kirim", async () => {
    await printLabels([{ kode: "D-1", size: "Midi", qty: 2 }], { protocol: "escpos" });
    expect(writeBleFast).toHaveBeenCalledTimes(1);
    const text = new TextDecoder("latin1").decode(writeBleFast.mock.calls[0][1]);
    expect(text).not.toContain("SIZE 40 mm,30 mm");
    expect(text).not.toContain("PRINT 1,");
    expect(disconnectPrinter).toHaveBeenCalledTimes(1);
    expect(scheduleIdleDisconnect).not.toHaveBeenCalled();
  });
  it("escposPaperWidthMm='80' nambah margin kiri-kanan (konten di tengah kertas lebih lebar) -- job lebih besar dari mode 40mm", async () => {
    await printLabels([{ kode: "D-1", size: "Midi", qty: 1 }], {
      protocol: "escpos",
      escposPaperWidthMm: "40",
    });
    const job40 = writeBleFast.mock.calls[0][1];
    writeBleFast.mockClear();
    await printLabels([{ kode: "D-1", size: "Midi", qty: 1 }], {
      protocol: "escpos",
      escposPaperWidthMm: "80",
    });
    const job80 = writeBleFast.mock.calls[0][1];
    expect(job80.length).toBeGreaterThan(job40.length);
  });
  it("default escposPaperWidthMm (tanpa opsi) = 40mm, sama persis dgn eksplisit 40mm", async () => {
    await printLabels([{ kode: "D-1", size: "Midi", qty: 1 }], { protocol: "escpos" });
    const jobDefault = writeBleFast.mock.calls[0][1];
    writeBleFast.mockClear();
    await printLabels([{ kode: "D-1", size: "Midi", qty: 1 }], {
      protocol: "escpos",
      escposPaperWidthMm: "40",
    });
    const job40 = writeBleFast.mock.calls[0][1];
    expect(jobDefault.length).toBe(job40.length);
  });
});
