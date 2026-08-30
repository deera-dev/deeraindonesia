import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TagihanShareCard from "./TagihanShareCard";

const GROUPS = [
  {
    bulan: "2026-08",
    total: 25500000,
    items: [
      {
        id: 1,
        nama_bahan: "Swiss Jacquard",
        motif: null,
        tanggal: "2026-04-30",
        jumlah: 600,
        satuan: "yard",
        jatuh_tempo: "2026-08-30",
        total_harga: 25500000,
        harga_satuan: 42500,
      },
    ],
  },
  {
    bulan: "2026-09",
    total: 15455000,
    items: [
      {
        id: 2,
        nama_bahan: "Sifon",
        motif: "Bunga",
        tanggal: "2026-05-24",
        jumlah: 562,
        satuan: "yard",
        jatuh_tempo: "2026-09-24",
        total_harga: 15455000,
        // harga_satuan sengaja tidak diisi -> harus fallback ke total_harga/jumlah
      },
    ],
  },
];

const GRAND_TOTAL = GROUPS.reduce((s, g) => s + g.total, 0); // 40.955.000

describe("TagihanShareCard", () => {
  it("menampilkan grand total semua bulan digabung", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    expect(screen.getByText(/40\.955\.000/)).toBeInTheDocument();
  });

  it("menampilkan judul tiap bulan (format singkat) & subtotal per bulan", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    expect(screen.getByText(/Jatuh Tempo Agu 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jatuh Tempo Sep 2026/)).toBeInTheDocument();
    // Masing-masing bulan cuma punya 1 item yg total_harga-nya SAMA dgn
    // subtotal bulan itu -> teks "Rp 25.500.000" muncul 2x (header subtotal
    // + baris total item), jadi pakai getAllByText (bukan getByText tunggal).
    expect(screen.getAllByText(/25\.500\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15\.455\.000/).length).toBeGreaterThan(0);
  });

  it("menampilkan nama bahan + motif utk tiap item lintas bulan", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    expect(screen.getByText("Swiss Jacquard")).toBeInTheDocument();
    expect(screen.getByText(/Sifon \/ Bunga/)).toBeInTheDocument();
  });

  it("menampilkan baris harga per satuan × jumlah (pakai harga_satuan langsung)", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    expect(screen.getByText(/Rp\s*42\.500\/yard\s*×\s*600\s*yard/)).toBeInTheDocument();
  });

  it("fallback hitung harga/satuan dari total_harga÷jumlah kalau harga_satuan kosong", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    // 15455000 / 562 = 27500
    expect(screen.getByText(/Rp\s*27\.500\/yard/)).toBeInTheDocument();
  });

  it("baris 'Beli' TIDAK mengulang qty (sudah ada di baris harga×qty) & digabung dgn Tempo satu baris", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    const swissRow = screen.getByText("Swiss Jacquard").parentElement.parentElement;
    expect(swissRow).toHaveTextContent("Beli 30 April 2026 · Tempo: 30 Agustus 2026");
    expect(swissRow).not.toHaveTextContent("Beli 30 April 2026 · 600 yard");
  });

  it("menampilkan footer deera.id", () => {
    render(<TagihanShareCard groups={GROUPS} />);
    expect(screen.getByText("deera.id")).toBeInTheDocument();
  });

  it("tidak error saat groups kosong", () => {
    render(<TagihanShareCard groups={[]} />);
    expect(screen.getByText("Total Semua Tagihan")).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*0/)).toBeInTheDocument();
  });

  it("forwardRef mengarah ke elemen kartu terluar", () => {
    const ref = React.createRef();
    render(<TagihanShareCard ref={ref} groups={GROUPS} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current.style.background).toBe("rgb(15, 11, 7)");
  });
});
