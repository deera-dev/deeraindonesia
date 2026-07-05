import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang" },
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
  formatTime: () => "10:00 WIB",
}));

import DetailModal from "./DetailModal";

const sale = {
  id: "s1", type: "sale", status: "synced",
  location: "gudang", buyer_name: "BUDI", buyer_hp: "081",
  created_at: "2026-07-04T03:00:00Z", total: 100000, discount: 0, edit_history: [],
  created_by_name: "Kasir A",
  items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 1, warna: null }],
};

describe("DetailModal", () => {
  it("returns null when sale=null", () => {
    const { container } = render(<DetailModal sale={null} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows buyer name", () => {
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("shows items with kode", () => {
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
  });

  it("shows total amount", () => {
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getAllByText(/100000/).length).toBeGreaterThan(0);
  });

  it("calls onClose when × button clicked", () => {
    const onClose = vi.fn();
    render(<DetailModal sale={sale} onClose={onClose} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows RETUR badge for retur sale", () => {
    const retur = { ...sale, type: "retur" };
    render(<DetailModal sale={retur} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("RETUR")).toBeInTheDocument();
  });

  it("shows synced status", () => {
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/Tersync/)).toBeInTheDocument();
  });

  it("shows Struk button", () => {
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/Struk/i)).toBeInTheDocument();
  });

  it("calls onStruk when Struk button clicked", () => {
    const onStruk = vi.fn();
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={onStruk} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByText(/Struk/i));
    expect(onStruk).toHaveBeenCalledWith(sale);
  });

  it("shows delete button", () => {
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/Hapus/i)).toBeInTheDocument();
  });

  it("calls onDelete when Hapus clicked", () => {
    const onDelete = vi.fn();
    render(<DetailModal sale={sale} onClose={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByText(/Hapus/i));
    expect(onDelete).toHaveBeenCalledWith(sale);
  });
});
