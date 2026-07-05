import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));

import LaporanRiwayat from "./LaporanRiwayat";

const noEditSales = [
  { id: "s1", type: "sale", location: "gudang", total: 100000,
    created_at: "2026-07-01T10:00:00Z", buyer_name: "BUDI", edit_history: [] },
];

const editedSales = [
  {
    id: "s2", type: "sale", location: "gudang", total: 150000,
    created_at: "2026-07-01T08:00:00Z", buyer_name: "ANI",
    edit_history: [
      { note: "salah input harga", by: "admin@test.com", at: "2026-07-01T10:00:00Z" },
    ],
  },
  {
    id: "s3", type: "sale", location: "gudang", total: 200000,
    created_at: "2026-07-01T09:00:00Z", buyer_name: null,
    edit_history: [
      { note: "koreksi qty", by: "kasir@test.com", at: "2026-07-01T11:00:00Z" },
      { note: "ubah harga", by: "admin@test.com", at: "2026-07-01T12:00:00Z" },
    ],
  },
];

describe("LaporanRiwayat", () => {
  it("shows empty state when no sales have edit_history", () => {
    render(<LaporanRiwayat sales={noEditSales} onDetail={vi.fn()} />);
    expect(screen.getByText("Belum ada riwayat edit")).toBeInTheDocument();
  });

  it("shows empty state when sales array is empty", () => {
    render(<LaporanRiwayat sales={[]} onDetail={vi.fn()} />);
    expect(screen.getByText("Belum ada riwayat edit")).toBeInTheDocument();
  });

  it("shows count of edited transactions", () => {
    render(<LaporanRiwayat sales={editedSales} onDetail={vi.fn()} />);
    expect(screen.getByText(/2 transaksi diedit/)).toBeInTheDocument();
  });

  it("renders buyer_name in uppercase when present", () => {
    render(<LaporanRiwayat sales={editedSales} onDetail={vi.fn()} />);
    expect(screen.getByText("ANI")).toBeInTheDocument();
  });

  it("renders edit history notes and authors", () => {
    render(<LaporanRiwayat sales={editedSales} onDetail={vi.fn()} />);
    expect(screen.getByText("salah input harga")).toBeInTheDocument();
    expect(screen.getAllByText("admin@test.com").length).toBeGreaterThan(0);
    expect(screen.getByText("koreksi qty")).toBeInTheDocument();
    expect(screen.getByText("ubah harga")).toBeInTheDocument();
  });

  it("shows Nx diedit badge with correct count", () => {
    render(<LaporanRiwayat sales={editedSales} onDetail={vi.fn()} />);
    expect(screen.getByText("1× diedit")).toBeInTheDocument();
    expect(screen.getByText("2× diedit")).toBeInTheDocument();
  });

  it("calls onDetail when transaction header button clicked", () => {
    const onDetail = vi.fn();
    render(<LaporanRiwayat sales={editedSales} onDetail={onDetail} />);
    fireEvent.click(screen.getByText("ANI").closest("button"));
    expect(onDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "s2" }));
  });

  it("calls onDetail for sale without buyer_name via total button", () => {
    const onDetail = vi.fn();
    render(<LaporanRiwayat sales={editedSales} onDetail={onDetail} />);
    fireEvent.click(screen.getByText("Rp 200000").closest("button"));
    expect(onDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "s3" }));
  });

  it("formats null edit history at as em dash", () => {
    const saleWithNullAt = {
      ...editedSales[0],
      id: "s4",
      edit_history: [{ note: "test", by: "x@x.com", at: null }],
    };
    render(<LaporanRiwayat sales={[saleWithNullAt]} onDetail={vi.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("sorts sales by most recent edit first", () => {
    render(<LaporanRiwayat sales={editedSales} onDetail={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const texts = buttons.map((b) => b.textContent);
    const s3Index = texts.findIndex((t) => t.includes("200000"));
    const s2Index = texts.findIndex((t) => t.includes("150000"));
    expect(s3Index).toBeLessThan(s2Index);
  });

  it("renders total amount in each transaction header", () => {
    render(<LaporanRiwayat sales={editedSales} onDetail={vi.fn()} />);
    expect(screen.getByText("Rp 150000")).toBeInTheDocument();
    expect(screen.getByText("Rp 200000")).toBeInTheDocument();
  });
});
