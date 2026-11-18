import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseCmtSetoranFull = vi.fn();
vi.mock("../hooks", () => ({
  useCmtSetoranFull: (...a) => mockUseCmtSetoranFull(...a),
}));

vi.mock("./SetoranFullForm", () => ({
  default: ({ onClose }) => (
    <div data-testid="setoran-full-form">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import CmtFullTab from "./CmtFullTab";

const ROW = (o) => ({
  id: "f1",
  nama_vendor: "Vendor B",
  kode_produk: "D-02-SFN",
  tanggal_setor: "2026-11-18",
  items: [{ size: "Midi", warna: "HITAM", qty: 5 }],
  total_upah: 50000,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCmtSetoranFull.mockReturnValue({ rows: [ROW({})], loading: false });
});

describe("CmtFullTab", () => {
  it("menampilkan daftar setoran dengan breakdown item", () => {
    render(<CmtFullTab />);
    expect(screen.getByText("Vendor B")).toBeInTheDocument();
    expect(screen.getByText(/D-02-SFN/)).toBeInTheDocument();
    expect(screen.getByText(/Midi · HITAM — 5 pcs/)).toBeInTheDocument();
  });

  it("loading -> teks Memuat", () => {
    mockUseCmtSetoranFull.mockReturnValue({ rows: [], loading: true });
    render(<CmtFullTab />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("kosong -> teks belum ada setoran", () => {
    mockUseCmtSetoranFull.mockReturnValue({ rows: [], loading: false });
    render(<CmtFullTab />);
    expect(screen.getByText(/Belum ada setoran CMT Full/)).toBeInTheDocument();
  });

  it("klik + Terima Setoran CMT Full membuka form", () => {
    render(<CmtFullTab />);
    fireEvent.click(screen.getByText("+ Terima Setoran CMT Full"));
    expect(screen.getByTestId("setoran-full-form")).toBeInTheDocument();
  });
});
