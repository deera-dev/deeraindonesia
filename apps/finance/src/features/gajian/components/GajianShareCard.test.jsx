import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  fmtTanggal: vi.fn((v) => v || ""),
}));

import GajianShareCard from "./GajianShareCard";

const gajianDraft = {
  tanggal_sabtu: "2026-07-04",
  status: "draft",
};
const gajianFinal = {
  tanggal_sabtu: "2026-07-04",
  status: "final",
  total_gaji: 5000000,
  total_potong: 1000000,
  total_jahit: 2000000,
  total_finishing: 500000,
  total_request: 4800000,
  pettycash: 100000,
  tambahan: [],
  kasbon_deductions: [],
};

const totals = { gaji: 5000000, potong: 1000000, jahit: 2000000, finishing: 0, qa: 0, kreatif: 0, cmt: 0 };
const perKaryawan = [
  ["BUDI", { total: 1500000, nama_bank: "BCA", no_rekening: "123", rincian: [{ label: "Jahit 10 pcs", sub: 200000 }] }],
];

describe("GajianShareCard (draft mode)", () => {
  it("renders Ringkasan Gajian heading", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={perKaryawan}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={4500000}
      />
    );
    expect(screen.getByText("Ringkasan Gajian")).toBeInTheDocument();
  });

  it("renders tanggal_sabtu", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={perKaryawan}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={4500000}
      />
    );
    expect(screen.getByText("2026-07-04")).toBeInTheDocument();
  });

  it("does not show FINAL badge in draft mode", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={perKaryawan}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={4500000}
      />
    );
    expect(screen.queryByText("FINAL")).toBeNull();
  });

  it("shows FINAL badge in final mode", () => {
    render(
      <GajianShareCard
        gajian={gajianFinal}
        totals={totals}
        perKaryawan={[]}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={4800000}
      />
    );
    expect(screen.getByText("FINAL")).toBeInTheDocument();
  });

  it("renders per-karyawan nama and rekening", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={perKaryawan}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={4500000}
      />
    );
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText(/BCA.*123/)).toBeInTheDocument();
  });

  it("renders tim rows with nonzero values", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={[]}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={4500000}
      />
    );
    expect(screen.getByText("Tim Potong")).toBeInTheDocument();
    expect(screen.getByText("Tim Jahit")).toBeInTheDocument();
  });

  it("renders pettycash when > 0", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={[]}
        tambahan={[]}
        pettycash="200000"
        kasbonDeds={[]}
        totalRequest={4700000}
      />
    );
    expect(screen.getByText("+ Pettycash")).toBeInTheDocument();
  });

  it("renders kasbon deductions when > 0", () => {
    render(
      <GajianShareCard
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={[]}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[{ nama: "BUDI", jumlah: 300000 }]}
        totalRequest={4200000}
      />
    );
    expect(screen.getByText(/Kasbon BUDI/)).toBeInTheDocument();
  });

  it("forwards ref to container div", () => {
    const ref = React.createRef();
    render(
      <GajianShareCard
        ref={ref}
        gajian={gajianDraft}
        totals={totals}
        perKaryawan={[]}
        tambahan={[]}
        pettycash="0"
        kasbonDeds={[]}
        totalRequest={0}
      />
    );
    expect(ref.current).not.toBeNull();
  });
});
