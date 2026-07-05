import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang" },
}));

import ReturModal from "./ReturModal";

const sale = {
  id: "s1", type: "sale", location: "gudang",
  items: [
    { kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 2, warna: null },
  ],
};

describe("ReturModal", () => {
  it("shows Retur Barang header", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    expect(screen.getByText("Retur Barang")).toBeInTheDocument();
  });

  it("shows item kode", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<ReturModal sale={sale} onClose={onClose} onConfirm={vi.fn()} saving={false} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Konfirmasi Retur button disabled when no items selected", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    const btn = screen.getByText(/Konfirmasi Retur/i);
    expect(btn).toBeDisabled();
  });

  it("calls onConfirm after incrementing qty with + button", () => {
    const onConfirm = vi.fn();
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={onConfirm} saving={false} />);
    // click + to increment qty from 0 to 1
    const plusBtns = screen.getAllByLabelText("Tambah");
    fireEvent.click(plusBtns[0]);
    // Konfirmasi Retur is now enabled
    fireEvent.click(screen.getByText(/Konfirmasi Retur/i));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows saving text when saving=true", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={true} />);
    expect(screen.getByText("Memproses...")).toBeInTheDocument();
  });

  it("warna item: shows warna list", () => {
    const saleWarna = {
      ...sale,
      items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, warna: [{ nama: "HITAM", qty: 2 }, { nama: "MERAH", qty: 1 }] }],
    };
    render(<ReturModal sale={saleWarna} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });
});
