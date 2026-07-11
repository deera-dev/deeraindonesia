import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BatchDetail from "./BatchDetail";

// `modal` sekarang datang langsung dari RPC get_laporan_produksi (bukan
// dihitung ulang di komponen dari hpp_per_item × total_kain), jadi fixture
// test menyertakan field `modal` secara eksplisit, mereplikasi apa yang
// akan dikirim RPC (85000 * 5 = 425000).
const batch = {
  id: "b1",
  hpp_per_item: 85000,
  total_kain: 5,
  modal: 425000,
  sizes: [
    { size: "Midi", warna: [{ warna: "HITAM", qty: 3 }, { warna: "_", qty: 2 }] },
  ],
  bahan_dipakai: [
    { nama_bahan: "Wolfis", satuan: "yard", jumlah: 25 },
    { nama_bahan: "Sifon", satuan: "meter", jumlah: 10 },
  ],
  catatan: "Catatan batch ini.",
};

describe("BatchDetail", () => {
  it("shows total modal when hpp > 0", () => {
    render(<BatchDetail batch={batch} />);
    // 85000 * 5 = 425000 → Rp 425.000
    expect(screen.getByText(/425\.000/)).toBeInTheDocument();
  });

  it("shows size breakdown", () => {
    render(<BatchDetail batch={batch} />);
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText(/HITAM/)).toBeInTheDocument();
  });

  it("replaces warna _ with —", () => {
    render(<BatchDetail batch={batch} />);
    expect(screen.queryByText("_")).not.toBeInTheDocument();
    expect(screen.getByText(/—.*qty|qty.*—|—: 2/)).toBeInTheDocument();
  });

  it("shows bahan dipakai", () => {
    render(<BatchDetail batch={batch} />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.getByText("25.00")).toBeInTheDocument();
    expect(screen.getByText("yard")).toBeInTheDocument();
  });

  it("shows catatan", () => {
    render(<BatchDetail batch={batch} />);
    expect(screen.getByText("Catatan batch ini.")).toBeInTheDocument();
  });

  it("shows warning when bahan empty", () => {
    render(<BatchDetail batch={{ ...batch, bahan_dipakai: [] }} />);
    expect(screen.getByText(/Bahan dipakai belum tercatat/)).toBeInTheDocument();
  });

  it("does not show modal when hpp=0", () => {
    render(<BatchDetail batch={{ ...batch, hpp_per_item: 0, modal: 0 }} />);
    expect(screen.queryByText(/Total Modal Batch/)).not.toBeInTheDocument();
  });

  it("does not show catatan section when catatan is null", () => {
    render(<BatchDetail batch={{ ...batch, catatan: null }} />);
    expect(screen.queryByText(/Catatan/)).not.toBeInTheDocument();
  });
});
