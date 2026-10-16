import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let hist = [];
vi.mock("../hooks", () => ({ useProductChangeHistory: () => ({ history: hist, loading: false }) }));
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
        changed_at: "2026-10-16T03:05:26Z", user_name: "DIKA", action: "edit",
        changes: [{ kind: "harga", label: "Gamis Jumbo", from: 220000, to: 230000 }],
      },
    ];
    render(<ProductChangeHistory kode="D-01" />);
    const el = screen.getByTestId("change-history");
    expect(el).toHaveTextContent("Harga Gamis Jumbo");
    expect(el).toHaveTextContent("Rp 220.000");
    expect(el).toHaveTextContent("Rp 230.000");
    expect(el).toHaveTextContent("DIKA");
    expect(el).toHaveTextContent("2026");
  });

  it("tampilkan semua saat riwayat melebihi batas", () => {
    hist = Array.from({ length: 8 }, (_, i) => ({
      changed_at: `2026-10-${10 + i}T03:00:00Z`, user_name: "A", action: "edit",
      changes: [{ kind: "hpp", label: "HPP", from: 100 + i, to: 200 + i }],
    }));
    render(<ProductChangeHistory kode="D-01" limit={3} />);
    expect(screen.getAllByText("HPP")).toHaveLength(3);
    fireEvent.click(screen.getByText("Tampilkan semua (8)"));
    expect(screen.getAllByText("HPP")).toHaveLength(8);
  });
});
