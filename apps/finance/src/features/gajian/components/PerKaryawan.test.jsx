import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));
vi.mock("../hooks", () => ({
  usePerKaryawanRincian: vi.fn(() => ({
    perKaryawan: [
      ["BUDI", { total: 1500000, nama_bank: "BCA", no_rekening: "123", rincian: [{ label: "Jahit 5 pcs", sub: 100000 }] }],
      ["ANI",  { total: 800000,  nama_bank: null,  no_rekening: null,  rincian: [] }],
    ],
    loading: false,
  })),
}));

import * as gajianHooks from "../hooks";
import PerKaryawan from "./PerKaryawan";

describe("PerKaryawan", () => {
  it("renders karyawan names", () => {
    render(<PerKaryawan gajianId="g1" kasbonDeds={[]} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("ANI")).toBeInTheDocument();
  });

  it("renders bank info when available", () => {
    render(<PerKaryawan gajianId="g1" kasbonDeds={[]} />);
    expect(screen.getByText(/BCA.*123/)).toBeInTheDocument();
  });

  it("renders rincian items", () => {
    render(<PerKaryawan gajianId="g1" kasbonDeds={[]} />);
    expect(screen.getByText("Jahit 5 pcs")).toBeInTheDocument();
  });

  it("renders kasbon deduction info when present", () => {
    render(
      <PerKaryawan gajianId="g1" kasbonDeds={[{ nama: "BUDI", jumlah: 300000 }]} />
    );
    expect(screen.getByText(/Kasbon/)).toBeInTheDocument();
  });

  it("returns null when loading", () => {
    gajianHooks.usePerKaryawanRincian.mockReturnValueOnce({ perKaryawan: [], loading: true });
    const { container } = render(<PerKaryawan gajianId="g1" kasbonDeds={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when perKaryawan is empty", () => {
    gajianHooks.usePerKaryawanRincian.mockReturnValueOnce({ perKaryawan: [], loading: false });
    const { container } = render(<PerKaryawan gajianId="g1" kasbonDeds={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
