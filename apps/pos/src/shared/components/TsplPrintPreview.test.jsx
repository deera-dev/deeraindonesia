import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("../hooks/useTsplPrinter", () => ({
  previewTspl: vi.fn(
    () =>
      'SIZE 78 mm,50 mm\r\nGAP 0 mm,0 mm\r\nCLS\r\n' +
      'TEXT 280,8,"2",0,4,2,"DEERA"\r\n' +
      "REVERSE 0,0,623,84\r\n" +
      "BAR 0,118,623,3\r\n" +
      "PRINT 1,1\r\n",
  ),
  PAPER_WIDTHS: {
    100: { label: "100mm", dots: 800 },
    78: { label: "78mm (Bawaan)", dots: 623 },
  },
  FONT: {
    2: { w: 12, h: 20 },
    3: { w: 16, h: 24 },
    4: { w: 24, h: 32 },
  },
}));

import TsplPrintPreview from "./TsplPrintPreview";

const saleMock = { buyer_name: "BUDI", type: "sale", items: [] };

describe("TsplPrintPreview", () => {
  it("renders a <canvas> element", () => {
    const { getByTestId } = render(
      <TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="78" />,
    );
    expect(getByTestId("tspl-print-preview-canvas").tagName).toBe("CANVAS");
  });

  it("sizes the canvas width to PAPER_WIDTHS[paperWidth].dots", () => {
    const { getByTestId } = render(
      <TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="78" />,
    );
    expect(getByTestId("tspl-print-preview-canvas")).toHaveAttribute("width", "623");
  });

  it("sizes the canvas width to 800 dots when paperWidth is 100", () => {
    const { getByTestId } = render(
      <TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="100" />,
    );
    expect(getByTestId("tspl-print-preview-canvas")).toHaveAttribute("width", "800");
  });

  it("computes canvas height from heightMm parsed out of the SIZE header (50mm here)", () => {
    // density = 623 dots / 78mm ≈ 7.987 → 50mm * 7.987 ≈ 399
    const { getByTestId } = render(
      <TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="78" />,
    );
    const heightAttr = Number(getByTestId("tspl-print-preview-canvas").getAttribute("height"));
    expect(heightAttr).toBeGreaterThan(300);
    expect(heightAttr).toBeLessThan(500);
  });

  it("calls previewTspl with sale/labelType/paperWidth", async () => {
    const { previewTspl } = await import("../hooks/useTsplPrinter");
    render(<TsplPrintPreview sale={saleMock} labelType="gapped" paperWidth="100" />);
    expect(previewTspl).toHaveBeenCalledWith(saleMock, "gapped", "100");
  });

  it("does not throw when canvas 2d context is unavailable (jsdom default)", () => {
    // jsdom tidak implement HTMLCanvasElement getContext('2d') secara penuh —
    // pastikan komponen tetap render tanpa crash (guard `if (!ctx) return`).
    expect(() =>
      render(<TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="78" />),
    ).not.toThrow();
  });

  describe("bitmap op — logo asli (permintaan Denny 2026-08 'coba tambahkan logo asli')", () => {
    // jsdom TIDAK implement getContext('2d') secara penuh (lihat test di
    // atas) — utk benar2 menjalankan drawPage() (bukan cuma no-op guard),
    // mock getContext supaya mengembalikan fake context dgn method yg
    // dipakai kode (createImageData/putImageData jadi fokus di sini).
    function mockCanvasContext() {
      const putImageDataCalls = [];
      const ctx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        measureText: vi.fn(() => ({ width: 10 })),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        fillText: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        createImageData: vi.fn((w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })),
        putImageData: vi.fn((imgData, x, y) => putImageDataCalls.push({ imgData, x, y })),
      };
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
      return { ctx, putImageDataCalls };
    }

    it("calls putImageData for a BITMAP op without throwing (bit 1 = opaque hitam, bit 0 = transparan)", async () => {
      const { ctx } = mockCanvasContext();
      const { previewTspl } = await import("../hooks/useTsplPrinter");
      // 1 byte lebar (8px) x 2 baris: baris 1 = 0xFF (semua cetak), baris 2 =
      // 0x00 (semua kosong) — data biner mentah, BUKAN escape teks.
      const data = "\xff\x00";
      previewTspl.mockReturnValueOnce(
        `SIZE 78 mm,50 mm\r\nGAP 0 mm,0 mm\r\nCLS\r\nBITMAP 10,20,1,2,0,${data}\r\nPRINT 1,1\r\n`,
      );
      expect(() =>
        render(<TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="78" />),
      ).not.toThrow();
      expect(ctx.createImageData).toHaveBeenCalledWith(8, 2);
      expect(ctx.putImageData).toHaveBeenCalledTimes(1);
      const [imgData, x, y] = ctx.putImageData.mock.calls[0];
      expect(x).toBe(10);
      expect(y).toBe(20);
      // Baris 1 (byte 0xFF): semua 8 pixel alpha=255 (opaque/hitam).
      for (let col = 0; col < 8; col++) {
        expect(imgData.data[col * 4 + 3]).toBe(255);
      }
      // Baris 2 (byte 0x00): semua 8 pixel alpha=0 (transparan/tidak dicetak).
      for (let col = 0; col < 8; col++) {
        expect(imgData.data[(8 + col) * 4 + 3]).toBe(0);
      }
    });
  });

  describe("Multi-halaman (kertas 'gapped' dgn konten > 1 label — keluhan Denny 2026-08)", () => {
    it("renders ONE canvas (no page label) when previewTspl returns a single SIZE/…/PRINT block", () => {
      const { getByTestId, queryByText } = render(
        <TsplPrintPreview sale={saleMock} labelType="continuous" paperWidth="78" />,
      );
      expect(getByTestId("tspl-print-preview-canvas").tagName).toBe("CANVAS");
      expect(queryByText(/Halaman 1 dari/)).not.toBeInTheDocument();
    });

    it("renders MULTIPLE canvases, one per page, when previewTspl returns 2 concatenated SIZE/…/PRINT blocks", async () => {
      const { previewTspl } = await import("../hooks/useTsplPrinter");
      previewTspl.mockReturnValueOnce(
        'SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\n' +
          'TEXT 20,8,"2",0,1,1,"Halaman 1"\r\n' +
          "PRINT 1,1\r\n" +
          'SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\n' +
          'TEXT 20,8,"2",0,1,1,"Halaman 2"\r\n' +
          "PRINT 1,1\r\n",
      );
      const { getByTestId, getByText } = render(
        <TsplPrintPreview sale={saleMock} labelType="gapped" paperWidth="78" />,
      );
      expect(getByTestId("tspl-print-preview-canvas").tagName).toBe("CANVAS");
      expect(getByTestId("tspl-print-preview-canvas-1").tagName).toBe("CANVAS");
      expect(getByText("Halaman 1 dari 2")).toBeInTheDocument();
      expect(getByText("Halaman 2 dari 2")).toBeInTheDocument();
    });
  });
});
