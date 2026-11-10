import { describe, it, expect } from "vitest";
import { buildImageEscPos } from "./escposImage";
import { MAX_PAGE_BYTES } from "./tsplImage";

describe("buildImageEscPos", () => {
  it("diawali ESC @ (init) lalu GS v 0 dengan lebar/tinggi little-endian, diakhiri feed baris", () => {
    const bitmap = { widthBytes: 2, height: 3, bytes: new Uint8Array(6).fill(0xaa), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 2 });
    expect(Array.from(out.subarray(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(out.subarray(2, 10))).toEqual([0x1d, 0x76, 0x30, 0x00, 2, 0, 3, 0]);
    expect(Array.from(out.subarray(10, 16))).toEqual([0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
    expect(Array.from(out.subarray(16))).toEqual([0x0a, 0x0a]);
  });

  it("lebar/tinggi > 255 dikodekan 2 byte little-endian dengan benar", () => {
    const widthBytes = 300;
    const height = 260;
    const bitmap = { widthBytes, height, bytes: new Uint8Array(widthBytes * height).fill(0x00), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 0 });
    const header = out.subarray(2, 10);
    expect(header[4]).toBe(widthBytes & 0xff);
    expect(header[5]).toBe((widthBytes >> 8) & 0xff);
    expect(header[6]).toBe(height & 0xff);
    expect(header[7]).toBe((height >> 8) & 0xff);
  });

  it("struk panjang dipecah jadi beberapa blok GS v 0 (buffer printer terbatas), tanpa kehilangan data", () => {
    const widthBytes = 78;
    const rows = Math.floor(MAX_PAGE_BYTES / widthBytes) * 2 + 100;
    const bytes = new Uint8Array(widthBytes * rows).fill(0xff);
    const bitmap = { widthBytes, height: rows, bytes, whiteByte: 0xff };
    const out = buildImageEscPos(bitmap);

    let count = 0;
    let totalDataBytes = 0;
    for (let i = 0; i + 8 <= out.length; i++) {
      if (out[i] === 0x1d && out[i + 1] === 0x76 && out[i + 2] === 0x30 && out[i + 3] === 0x00) {
        count++;
        const wB = out[i + 4] | (out[i + 5] << 8);
        const hB = out[i + 6] | (out[i + 7] << 8);
        totalDataBytes += wB * hB;
      }
    }
    expect(count).toBeGreaterThanOrEqual(3);
    expect(totalDataBytes).toBe(widthBytes * rows);
  });

  it("struk kecil tetap satu blok GS v 0", () => {
    const bitmap = { widthBytes: 78, height: 50, bytes: new Uint8Array(78 * 50).fill(0xff), whiteByte: 0xff };
    const out = buildImageEscPos(bitmap);
    let count = 0;
    for (let i = 0; i + 4 <= out.length; i++) {
      if (out[i] === 0x1d && out[i + 1] === 0x76 && out[i + 2] === 0x30 && out[i + 3] === 0x00) count++;
    }
    expect(count).toBe(1);
  });
});
