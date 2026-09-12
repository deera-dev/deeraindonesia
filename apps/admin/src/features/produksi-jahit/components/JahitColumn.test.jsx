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

// Tab switcher mobile (permintaan Denny 2026-09) — kolom yang tidak aktif
// disembunyikan (`hidden`) di mobile, tapi TETAP tampil di md+ (`md:block`)
// terlepas dari `active`.
describe("JahitColumn — visibility (mobile tab switcher)", () => {
  it("active=true (default): tidak ada class 'hidden' di container", () => {
    render(<JahitColumn label="Belum Assign" cards={cards} onAssign={vi.fn()} />);
    const container = screen.getByText("Belum Assign").closest("div.bg-skin-raised");
    expect(container.className).toContain("block");
    expect(container.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("active=false: container dapat class 'hidden' (disembunyikan di mobile) tapi tetap 'md:block'", () => {
    render(<JahitColumn label="On Progress" cards={cards} active={false} onAssign={vi.fn()} />);
    const container = screen.getByText("On Progress").closest("div.bg-skin-raised");
    expect(container.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(container.className).toContain("md:block");
  });
});
