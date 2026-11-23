import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const print = vi.fn().mockResolvedValue(true);
const setQty = vi.fn();
const setProtocol = vi.fn();
vi.mock("../hooks", () => ({
  useLabelPrint: () => ({
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
  }),
  labelDataUrl: async () => "data:image/png;base64,AAAA",
  labelText: (k, s) => `${k} ${s}`.toUpperCase(),
  labelUrl: (k) => `https://deera.id/code/${k}?src=qr`,
  PRINTER_PROTOCOLS: {
    tspl: { label: "TSPL (printer label)" },
    escpos: { label: "ESC/POS (printer struk)" },
  },
}));
import CetakLabelModal from "./CetakLabelModal";

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
});
