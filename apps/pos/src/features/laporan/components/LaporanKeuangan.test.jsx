import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => item.qty ?? 1,
  itemProfit: (item) => (item.harga - (item.hpp ?? 0)) * (item.qty ?? 1),
}));

import LaporanKeuangan from "./LaporanKeuangan";

const sales = [
  { id: "s1", type: "sale", date: "2026-07-04", total: 100000, discount: 0,
    items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 1 }] },
  { id: "s2", type: "retur", date: "2026-07-04", total: 100000, discount: 0, items: [] },
];

describe("LaporanKeuangan", () => {
  it("renders Omset section", () => {
    render(<LaporanKeuangan sales={sales} />);
    expect(screen.getAllByText(/Omset|omset/i)[0]).toBeInTheDocument();
  });

  it("shows total omset from non-retur sales", () => {
    render(<LaporanKeuangan sales={sales} />);
    expect(screen.getByText("100000")).toBeInTheDocument();
  });

  it("renders with empty sales", () => {
    const { container } = render(<LaporanKeuangan sales={[]} />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("shows keuntungan section", () => {
    render(<LaporanKeuangan sales={sales} />);
    expect(screen.getAllByText(/Untung|keuntungan|Keuntungan/i)[0]).toBeInTheDocument();
  });
});
