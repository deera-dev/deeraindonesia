import { describe, it, expect, vi, beforeEach } from "vitest";

const writeBleFast = vi.fn().mockResolvedValue();
vi.mock("@deera/shared/lib/blePrinter", () => ({
  writeBleFast: (...a) => writeBleFast(...a),
  bleConnect: vi.fn().mockResolvedValue({ char: {} }),
  scheduleIdleDisconnect: vi.fn(),
  disconnectPrinter: vi.fn(),
}));
vi.mock("./render", () => ({
  labelGray: () => ({ data: new Uint8ClampedArray(320 * 240 * 4).fill(255), w: 320, h: 240 }),
}));
import { printLabels } from "./print";

describe("printLabels", () => {
  beforeEach(() => {
    writeBleFast.mockClear();
    Object.defineProperty(navigator, "bluetooth", { value: {}, configurable: true });
  });
  it("mengirim satu job per ukuran ber-qty > 0", async () => {
    await printLabels([{ kode: "D-1", size: "Midi", qty: 3 }, { kode: "D-1", size: "Gamis", qty: 0 }]);
    expect(writeBleFast).toHaveBeenCalledTimes(1);
    const text = new TextDecoder("latin1").decode(writeBleFast.mock.calls[0][1]);
    expect(text.match(/SIZE 40 mm,30 mm/g)).toHaveLength(1);
    expect(text).toContain("PRINT 1,3");
  });
  it("menolak bila semua jumlah 0", async () => {
    await expect(printLabels([{ kode: "D-1", size: "Midi", qty: 0 }])).rejects.toThrow("masih 0");
  });
  it("menolak tanpa Web Bluetooth", async () => {
    Object.defineProperty(navigator, "bluetooth", { value: undefined, configurable: true });
    await expect(printLabels([{ kode: "D-1", size: "Midi", qty: 1 }])).rejects.toThrow("Bluetooth");
  });
});
