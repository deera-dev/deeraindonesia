import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockQrDataUrl = vi.fn((text) => Promise.resolve(`data:image/png;base64,fake-${text}`));
vi.mock("../render", () => ({
  qrDataUrl: (...args) => mockQrDataUrl(...args),
}));

import PrintKartuBatchModal from "./PrintKartuBatchModal";

const cards = [
  { id: "c1", kode_produk: "D-053-LBR", nama_produk: "Brukat Bordir", size: "Midi", warna: "COKLAT MUDA", qty: 15 },
  { id: "c2", kode_produk: "D-053-LBR", nama_produk: "Brukat Bordir", size: "Midi", warna: "COKLAT TUA", qty: 12 },
  { id: "c3", kode_produk: "D-053-LBR", nama_produk: "Brukat Bordir", size: "Midi", warna: "UNGU", qty: 8 },
];

describe("PrintKartuBatchModal", () => {
  let onClose;
  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  it("tidak render apapun kalau cards kosong/null", () => {
    const { container: c1 } = render(<PrintKartuBatchModal cards={null} onClose={onClose} />);
    expect(c1).toBeEmptyDOMElement();
    const { container: c2 } = render(<PrintKartuBatchModal cards={[]} onClose={onClose} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it("menampilkan jumlah kartu & kode produk di header", () => {
    render(<PrintKartuBatchModal cards={cards} onClose={onClose} />);
    expect(screen.getByText("Cetak 3 Kartu")).toBeInTheDocument();
    expect(screen.getAllByText("D-053-LBR").length).toBeGreaterThan(0);
  });

  it("merender satu KartuJahitContent per kartu (semua warna tampil)", () => {
    render(<PrintKartuBatchModal cards={cards} onClose={onClose} />);
    expect(screen.getByText("COKLAT MUDA")).toBeInTheDocument();
    expect(screen.getByText("COKLAT TUA")).toBeInTheDocument();
    expect(screen.getByText("UNGU")).toBeInTheDocument();
  });

  it("generate barcode terpisah utk tiap kartu (URL /j/:id masing-masing)", async () => {
    render(<PrintKartuBatchModal cards={cards} onClose={onClose} />);
    await waitFor(() => expect(mockQrDataUrl).toHaveBeenCalledTimes(3));
    expect(mockQrDataUrl).toHaveBeenCalledWith("https://deera.id/j/c1", 400);
    expect(mockQrDataUrl).toHaveBeenCalledWith("https://deera.id/j/c2", 400);
    expect(mockQrDataUrl).toHaveBeenCalledWith("https://deera.id/j/c3", 400);
  });

  it("tombol Print N Kartu memanggil window.print()", async () => {
    const user = userEvent.setup();
    render(<PrintKartuBatchModal cards={cards} onClose={onClose} />);
    await user.click(screen.getByText("Print 3 Kartu"));
    expect(window.print).toHaveBeenCalled();
  });

  it("tombol Tutup memanggil onClose", async () => {
    const user = userEvent.setup();
    render(<PrintKartuBatchModal cards={cards} onClose={onClose} />);
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });
});
