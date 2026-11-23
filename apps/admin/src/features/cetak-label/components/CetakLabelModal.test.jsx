import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const print = vi.fn().mockResolvedValue(true);
const setQty = vi.fn();
const setProtocol = vi.fn();
const setEscposPaperWidthMm = vi.fn();
const useLabelPrintMock = vi.fn();
vi.mock("../hooks", () => ({
  useLabelPrint: (...a) => useLabelPrintMock(...a),
  labelDataUrl: async () => "data:image/png;base64,AAAA",
  labelText: (k, s) => `${k} ${s}`.toUpperCase(),
  labelUrl: (k) => `https://deera.id/code/${k}?src=qr`,
  PRINTER_PROTOCOLS: {
    tspl: { label: "TSPL (printer label)" },
    escpos: { label: "ESC/POS (printer struk)" },
  },
  ESCPOS_PAPER_WIDTHS: {
    40: { label: "40mm (mode Label)" },
    80: { label: "80mm (mode Struk/Receipt)" },
  },
}));
import CetakLabelModal from "./CetakLabelModal";

function baseLabelPrint(overrides = {}) {
  return {
    rows: [
      { size: "Midi", produced: 45, qty: 45 },
      { size: "Gamis", produced: 10, qty: 10 },
    ],
    isLoading: false,
    setQty,
    total: 55,
    print,
    busy: false,
    progress: null,
    error: "",
    protocol: "tspl",
    setProtocol,
    escposPaperWidthMm: "40",
    setEscposPaperWidthMm,
    ...overrides,
  };
}

beforeEach(() => {
  useLabelPrintMock.mockReset().mockReturnValue(baseLabelPrint());
});

describe("CetakLabelModal", () => {
  it("menampilkan baris per ukuran dengan jumlah default dan mencetak", async () => {
    const onClose = vi.fn();
    render(<CetakLabelModal kode="D-1" onClose={onClose} />);
    expect(screen.getByLabelText("Jumlah label Midi")).toHaveValue(45);
    expect(screen.getByText("D-1 MIDI")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Jumlah label Gamis"), { target: { value: "12" } });
    expect(setQty).toHaveBeenCalledWith("Gamis", "12");
    fireEvent.click(screen.getByText("Print 55 label"));
    await waitFor(() => expect(print).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("menampilkan toggle protokol printer & bisa ganti ke ESC/POS", () => {
    render(<CetakLabelModal kode="D-1" onClose={vi.fn()} />);
    expect(screen.getByText("TSPL (printer label)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("ESC/POS (printer struk)"));
    expect(setProtocol).toHaveBeenCalledWith("escpos");
  });

  it("toggle lebar kertas ESC/POS TIDAK muncul saat protocol tspl", () => {
    render(<CetakLabelModal kode="D-1" onClose={vi.fn()} />);
    expect(screen.queryByText("40mm (mode Label)")).not.toBeInTheDocument();
    expect(screen.queryByText("80mm (mode Struk/Receipt)")).not.toBeInTheDocument();
  });

  it("toggle lebar kertas ESC/POS muncul saat protocol escpos, bisa ganti ke 80mm", () => {
    useLabelPrintMock.mockReturnValue(baseLabelPrint({ protocol: "escpos" }));
    render(<CetakLabelModal kode="D-1" onClose={vi.fn()} />);
    expect(screen.getByText("40mm (mode Label)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("80mm (mode Struk/Receipt)"));
    expect(setEscposPaperWidthMm).toHaveBeenCalledWith("80");
  });
});
