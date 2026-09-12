import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JahitColumn from "./JahitColumn";

const cards = [
  { id: "c1", kode_produk: "D-01-OSK", nama_produk: "Gamis A", size: "Midi", warna: "HITAM", qty: 5, status: "belum_assign" },
  { id: "c2", kode_produk: "D-02-OSK", nama_produk: "Gamis B", size: "Gamis", warna: "PUTIH", qty: 3, status: "belum_assign" },
];

describe("JahitColumn", () => {
  it("menampilkan label dan jumlah kartu", () => {
    render(<JahitColumn label="Belum Assign" cards={cards} onAssign={vi.fn()} />);
    expect(screen.getByText("Belum Assign")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-OSK")).toBeInTheDocument();
  });

  it("menampilkan pesan kosong kalau tidak ada kartu", () => {
    render(<JahitColumn label="On Progress" cards={[]} onAssign={vi.fn()} />);
    expect(screen.getByText("Belum ada kartu.")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
