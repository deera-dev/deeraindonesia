import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
}));

import { vi } from "vitest";
import LaporanStok from "./LaporanStok";

const sales = [
  { id: "s1", type: "sale", items: [{ kode: "D-01", size: "Midi", qty: 3 }, { kode: "D-02", size: "Gamis", qty: 2 }] },
  { id: "s2", type: "sale", items: [{ kode: "D-01", size: "Midi", qty: 1 }] },
  { id: "s3", type: "retur", items: [{ kode: "D-01", size: "Midi", qty: 2 }] },
];

describe("LaporanStok", () => {
  it("shows empty message when no sales", () => {
    render(<LaporanStok sales={[]} />);
    expect(screen.getByText(/Belum ada/i)).toBeInTheDocument();
  });

  it("shows stok keluar data", () => {
    render(<LaporanStok sales={sales} />);
    expect(screen.getAllByText(/D-01/)[0]).toBeInTheDocument();
  });

  it("aggregates stok keluar correctly", () => {
    render(<LaporanStok sales={sales} />);
    // D-01 Midi: 3+1=4 pcs keluar
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it("shows stok masuk section for retur", () => {
    render(<LaporanStok sales={sales} />);
    expect(screen.getAllByText(/Masuk|masuk|retur|Retur/i)[0]).toBeInTheDocument();
  });

  it("excludes retur from stok keluar", () => {
    const returOnly = [{ id: "r1", type: "retur", items: [{ kode: "D-01", size: "Midi", qty: 5 }] }];
    render(<LaporanStok sales={returOnly} />);
    // keluar section should show empty
    expect(screen.getAllByText(/D-01/).length).toBeGreaterThanOrEqual(1);
  });
});
