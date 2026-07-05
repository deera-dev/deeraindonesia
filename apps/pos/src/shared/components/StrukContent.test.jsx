import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: vi.fn((n) => String(n)),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));
vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: { nama: "DEERA Indonesia", wa: "628111", rekening: [] },
}));

import StrukContent from "./StrukContent";

const saleMock = {
  buyer_name: "BUDI",
  buyer_hp: "08111",
  date: "2026-07-04",
  type: "sale",
  location: "gudang",
  total: 99000,   // differs from item subtotal (2 * 50000 = 100000) for unique match
  discount: 0,
  created_at: "2026-07-04T08:00:00Z",
  items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 50000 }],
};

describe("StrukContent", () => {
  it("renders buyer_name", () => {
    render(<StrukContent sale={saleMock} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("renders buyer_hp", () => {
    render(<StrukContent sale={saleMock} />);
    expect(screen.getByText("08111")).toBeInTheDocument();
  });

  it("renders item kode", () => {
    render(<StrukContent sale={saleMock} />);
    // kode and size are in the same <p>: "D-01 — MIDI" — use regex
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
  });

  it("renders item size", () => {
    render(<StrukContent sale={saleMock} />);
    // size is uppercased in component — use case-insensitive regex
    expect(screen.getByText(/MIDI/i)).toBeInTheDocument();
  });

  it("renders total with formatHarga", () => {
    render(<StrukContent sale={saleMock} />);
    // total = 99000 is unique vs item subtotal 100000; component renders "Rp 99000"
    expect(screen.getByText(/99000/)).toBeInTheDocument();
  });

  it("renders RETUR label for retur type", () => {
    render(<StrukContent sale={{ ...saleMock, type: "retur" }} />);
    // "RETUR" appears in both "STRUK RETUR" and "TOTAL RETUR" — check presence
    expect(screen.getAllByText(/RETUR/i).length).toBeGreaterThan(0);
  });
});
