import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
  formatTime: (ts) => "10:00",
}));

import SaleCard from "./SaleCard";

const sale = {
  id: "s1", type: "sale", status: "synced",
  location: "gudang", buyer_name: "BUDI", buyer_hp: "081",
  created_at: "2026-07-04T03:00:00Z",
  items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 1, warna: null }],
  total: 100000, discount: 0, edit_history: [],
};

describe("SaleCard", () => {
  it("renders buyer name", () => {
    render(<SaleCard sale={sale} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("renders total", () => {
    render(<SaleCard sale={sale} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getAllByText(/100000/).length).toBeGreaterThan(0);
  });

  it("calls onDetail when header tapped", () => {
    const onDetail = vi.fn();
    render(<SaleCard sale={sale} onDetail={onDetail} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onDetail).toHaveBeenCalledWith(sale);
  });

  it("shows RETUR badge for retur type", () => {
    const returSale = { ...sale, type: "retur" };
    render(<SaleCard sale={returSale} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("RETUR")).toBeInTheDocument();
  });

  it("shows pending badge when status=pending", () => {
    const pendingSale = { ...sale, status: "pending" };
    render(<SaleCard sale={pendingSale} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/belum sync/)).toBeInTheDocument();
  });

  it("shows edit indicator when edit_history non-empty", () => {
    const editedSale = { ...sale, edit_history: [{ at: "2026-07-04" }] };
    render(<SaleCard sale={editedSale} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("✎")).toBeInTheDocument();
  });

  it("renders location label", () => {
    render(<SaleCard sale={sale} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/Gudang/)).toBeInTheDocument();
  });
});
