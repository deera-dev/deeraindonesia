import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

let hist = [];
vi.mock("../hooks", () => ({ useProductPriceHistory: () => ({ history: hist, loading: false }) }));

import ProductChangeHistory from "./ProductChangeHistory";

describe("ProductChangeHistory", () => {
  it("tidak render apa pun kalau belum ada riwayat", () => {
    hist = [];
    const { container } = render(<ProductChangeHistory kode="D-01" />);
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan harga dari→ke, tanggal, dan siapa", () => {
    hist = [
      {
        changed_at: "2026-10-16T03:05:26Z",
        user_name: "DIKA",
        changes: [{ kind: "harga", label: "Gamis Jumbo", from: 220000, to: 230000 }],
      },
    ];
    render(<ProductChangeHistory kode="D-01" />);
    const el = screen.getByTestId("price-history");
    expect(el).toHaveTextContent("Gamis Jumbo");
    expect(el).toHaveTextContent("Rp 220.000");
    expect(el).toHaveTextContent("Rp 230.000");
    expect(el).toHaveTextContent("DIKA");
    expect(el).toHaveTextContent("2026");
  });

  it("tampilkan semua saat riwayat melebihi batas", () => {
    hist = Array.from({ length: 8 }, (_, i) => ({
      changed_at: `2026-10-${10 + i}T03:00:00Z`,
      user_name: "A",
      changes: [{ kind: "harga", label: "Midi", from: 100 + i, to: 200 + i }],
    }));
    render(<ProductChangeHistory kode="D-01" limit={3} />);
    expect(screen.getAllByText("Midi")).toHaveLength(3);
    fireEvent.click(screen.getByText("Tampilkan semua (8)"));
    expect(screen.getAllByText("Midi")).toHaveLength(8);
  });
});
