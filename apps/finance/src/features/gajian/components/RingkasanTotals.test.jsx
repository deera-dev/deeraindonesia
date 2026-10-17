import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({ fmtRp: (v) => `Rp${v}` }));

import RingkasanTotals from "./RingkasanTotals";

const gajian = { status: "draft", tambahan: [], kasbon_deductions: [] };
const v = (over = {}) => ({
  isFinal: false,
  totals: { gaji: 3000, potong: 1000, jahit: 2000, finishing: 0 },
  loadingTotals: false,
  totalGaji: 3000,
  pettycash: 500,
  fullTambahan: [{ label: "Beli Gas", jumlah: 100000 }, { label: "Kosong", jumlah: 0 }],
  sKasbonDed: 0,
  totalRequest: 103500,
  ...over,
});

describe("RingkasanTotals", () => {
  it("total per tim (hanya yang > 0), pettycash, tambahan > 0 dan total mingguan", () => {
    render(<RingkasanTotals gajian={gajian} v={v()} />);
    expect(screen.getByText("Tim Potong")).toBeInTheDocument();
    expect(screen.getByText("Tim Jahit")).toBeInTheDocument();
    expect(screen.queryByText("Tim Finishing")).toBeNull();
    expect(screen.getByText(/Uang Denny & Wulan Terpakai/)).toBeInTheDocument();
    expect(screen.getByText("+ Beli Gas")).toBeInTheDocument();
    expect(screen.queryByText("+ Kosong")).toBeNull();
    expect(screen.getByText("Rp103500")).toBeInTheDocument();
  });

  it("potongan kasbon tampil saat > 0; memuat saat loadingTotals", () => {
    const { rerender } = render(<RingkasanTotals gajian={gajian} v={v({ sKasbonDed: 20000 })} />);
    expect(screen.getByText("−Rp20000")).toBeInTheDocument();
    rerender(<RingkasanTotals gajian={gajian} v={v({ loadingTotals: true })} />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("status final: angka dari data tersimpan", () => {
    const final = { status: "final", total_potong: 700, pettycash: 0, tambahan: [{ label: "Gas", jumlah: 5 }], kasbon_deductions: [{ nama: "Budi", jumlah: 9 }] };
    render(<RingkasanTotals gajian={final} v={v({ isFinal: true, pettycash: 0 })} />);
    expect(screen.getByText("Rp700")).toBeInTheDocument();
    expect(screen.getByText("+ Gas")).toBeInTheDocument();
    expect(screen.getByText("− Kasbon Budi")).toBeInTheDocument();
  });
});
