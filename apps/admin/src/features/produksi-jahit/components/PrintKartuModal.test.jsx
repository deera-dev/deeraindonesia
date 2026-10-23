import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../render", () => ({
  qrDataUrl: vi.fn(() => "data:image/png;base64,fake"),
}));

import PrintKartuModal from "./PrintKartuModal";

const card = {
  id: "11111111-2222-3333-4444-555555555555",
  kode_produk: "D-07-OSK",
  nama_produk: "Gamis Wolfis Polos",
  size: "Midi",
  warna: "HITAM",
  qty: 12,
};

describe("PrintKartuModal", () => {
  let onClose;
  beforeEach(() => {
    onClose = vi.fn();
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  it("tidak render apapun kalau card null", () => {
    const { container } = render(<PrintKartuModal card={null} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("menampilkan kode produk di header dan hint kertas 58x98mm Epson L1250", () => {
    render(<PrintKartuModal card={card} onClose={onClose} />);
    expect(screen.getAllByText("D-07-OSK").length).toBeGreaterThan(0);
    expect(screen.getByText(/58.*98 mm/)).toBeInTheDocument();
    expect(screen.getByText(/Epson L1250/)).toBeInTheDocument();
  });

  it("tombol Print Kartu memanggil window.print()", async () => {
    const user = userEvent.setup();
    render(<PrintKartuModal card={card} onClose={onClose} />);
    await user.click(screen.getByText("Print Kartu"));
    expect(window.print).toHaveBeenCalled();
  });

  it("tombol Tutup memanggil onClose", async () => {
    const user = userEvent.setup();
    render(<PrintKartuModal card={card} onClose={onClose} />);
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });
});
