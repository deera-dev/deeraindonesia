import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Pengelompokan per kode (permintaan Denny 2026-09: "terlalu pusing lihatnya"
// kalau 1 kode diulang di tiap kartu size×warna).
describe("JahitColumn — pengelompokan per kode", () => {
  const sameKodeCards = [
    { id: "c1", kode_produk: "D-053-LBR", nama_produk: "Brukat Bordir", size: "Midi", warna: "COKLAT MUDA", qty: 15, status: "belum_assign" },
    { id: "c2", kode_produk: "D-053-LBR", nama_produk: "Brukat Bordir", size: "Midi", warna: "COKLAT TUA", qty: 12, status: "belum_assign" },
    { id: "c3", kode_produk: "D-053-LBR", nama_produk: "Brukat Bordir", size: "Midi", warna: "UNGU", qty: 8, status: "belum_assign" },
  ];

  it("kode yang sama cuma tampil SEKALI sbg header grup, bukan diulang per kartu", () => {
    render(<JahitColumn label="Belum Assign" cards={sameKodeCards} onAssign={vi.fn()} />);
    expect(screen.getAllByText("D-053-LBR")).toHaveLength(1);
    expect(screen.getAllByText("Brukat Bordir")).toHaveLength(1);
  });

  it("header grup menampilkan total qty gabungan semua kartu di kode itu", () => {
    render(<JahitColumn label="Belum Assign" cards={sameKodeCards} onAssign={vi.fn()} />);
    expect(screen.getByText("35 pcs")).toBeInTheDocument(); // 15+12+8
  });

  it("tiap baris size/warna tetap tampil & tombol assign tetap jalan per kartu", async () => {
    const onAssign = vi.fn();
    const user = userEvent.setup();
    render(<JahitColumn label="Belum Assign" cards={sameKodeCards} onAssign={onAssign} />);
    expect(screen.getByText("Midi · COKLAT MUDA")).toBeInTheDocument();
    expect(screen.getByText("Midi · COKLAT TUA")).toBeInTheDocument();
    expect(screen.getByText("Midi · UNGU")).toBeInTheDocument();
    const buttons = screen.getAllByText("+ Penjahit");
    expect(buttons).toHaveLength(3);
    await user.click(buttons[1]);
    expect(onAssign).toHaveBeenCalledWith(sameKodeCards[1]);
  });

  it("kode berbeda tetap jadi grup terpisah", () => {
    render(<JahitColumn label="Belum Assign" cards={cards} onAssign={vi.fn()} />);
    expect(screen.getAllByText("D-01-OSK")).toHaveLength(1);
    expect(screen.getAllByText("D-02-OSK")).toHaveLength(1);
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
