import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng" },
}));

import LaporanPembeli from "./LaporanPembeli";

const sales = [
  { id: "s1", type: "sale", buyer_name: "BUDI", buyer_hp: "081", location: "gudang", total: 200000 },
  { id: "s2", type: "sale", buyer_name: "BUDI", buyer_hp: "081", location: "cideng", total: 100000 },
  { id: "s3", type: "sale", buyer_name: "ANI", buyer_hp: "082", location: "gudang", total: 150000 },
  { id: "s4", type: "sale", buyer_name: null, location: "gudang", total: 80000 },
  { id: "s5", type: "retur", buyer_name: "BUDI", location: "gudang", total: 50000 },
];

describe("LaporanPembeli", () => {
  it("shows empty message when no sales", () => {
    render(<LaporanPembeli sales={[]} />);
    expect(screen.getByText(/Belum ada/i)).toBeInTheDocument();
  });

  it("renders top pembeli", () => {
    render(<LaporanPembeli sales={sales} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("ANI")).toBeInTheDocument();
  });

  it("aggregates total per pembeli (excludes retur)", () => {
    render(<LaporanPembeli sales={sales} />);
    // BUDI: 200000 + 100000 = 300000
    expect(screen.getByText(/300000/)).toBeInTheDocument();
  });

  it("shows anonymous count", () => {
    render(<LaporanPembeli sales={sales} />);
    expect(screen.getByText(/tanpa nama|anonim|Anonim/i)).toBeInTheDocument();
  });

  it("shows location breakdown", () => {
    render(<LaporanPembeli sales={sales} />);
    expect(screen.getByText(/Gudang/)).toBeInTheDocument();
  });
});
