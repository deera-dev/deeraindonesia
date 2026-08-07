import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
}));
vi.mock("./SaleCard", () => ({
  default: ({ sale, onBuyerClick }) => (
    <div data-testid={`sale-${sale.id}`}>
      {sale.id}
      {onBuyerClick && (
        <button onClick={() => onBuyerClick(sale)} data-testid={`buyer-${sale.id}`}>buyer</button>
      )}
    </div>
  ),
}));

import TabTransaksi from "./TabTransaksi";

const sales = [
  { id: "s1", type: "sale", status: "synced", total: 100000, items: [{ harga: 100000, hpp: 80000, qty: 2 }] },
  { id: "s2", type: "sale", status: "pending", total: 90000, items: [{ harga: 90000, hpp: 70000, qty: 1 }] },
  { id: "s3", type: "retur", status: "synced", total: 50000, items: [] },
];

describe("TabTransaksi", () => {
  it("forwards onBuyerClick to SaleCard", () => {
    const onBuyerClick = vi.fn();
    render(<TabTransaksi sales={sales} onDetail={vi.fn()} onBuyerClick={onBuyerClick} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("buyer-s1"));
    expect(onBuyerClick).toHaveBeenCalledWith(sales[0]);
  });


  it("shows empty message when no sales", () => {
    render(<TabTransaksi sales={[]} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("Belum ada transaksi")).toBeInTheDocument();
  });

  it("renders sale cards", () => {
    render(<TabTransaksi sales={sales} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByTestId("sale-s1")).toBeInTheDocument();
    expect(screen.getByTestId("sale-s2")).toBeInTheDocument();
  });

  it("shows Transaksi count (excludes retur)", () => {
    render(<TabTransaksi sales={sales} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    // 2 real sales (s1, s2), s3 is retur
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows pending warning when pending > 0", () => {
    render(<TabTransaksi sales={sales} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(/belum sync/)).toBeInTheDocument();
  });

  it("does not show pending warning when no pending", () => {
    const noP = sales.filter(s => s.status !== "pending");
    render(<TabTransaksi sales={noP} onDetail={vi.fn()} onStruk={vi.fn()} onRetur={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.queryByText(/belum sync/)).not.toBeInTheDocument();
  });
});
