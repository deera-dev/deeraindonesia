import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseDoneJahitCards = vi.fn();
vi.mock("../hooks", () => ({
  useDoneJahitCards: (...args) => mockUseDoneJahitCards(...args),
}));

import JahitDoneSection from "./JahitDoneSection";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDoneJahitCards.mockReturnValue({ cards: [], loading: false });
});

describe("JahitDoneSection", () => {
  it("selalu render header 'Arsip Selesai', default tertutup", () => {
    render(<JahitDoneSection />);
    expect(screen.getByText("Arsip Selesai")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Cari kode...")).not.toBeInTheDocument();
    // enabled=false selama tertutup
    expect(mockUseDoneJahitCards).toHaveBeenCalledWith(expect.any(Object), false);
  });

  it("klik header membuka accordion, memicu query dgn enabled=true", async () => {
    const user = userEvent.setup();
    render(<JahitDoneSection />);
    await user.click(screen.getByText("Arsip Selesai"));
    expect(screen.getByPlaceholderText("Cari kode...")).toBeInTheDocument();
    expect(mockUseDoneJahitCards).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it("menampilkan pesan kosong kalau tidak ada kartu utk filter ini", async () => {
    const user = userEvent.setup();
    render(<JahitDoneSection />);
    await user.click(screen.getByText("Arsip Selesai"));
    expect(screen.getByText(/Belum ada kartu selesai/)).toBeInTheDocument();
  });

  it("menampilkan daftar kartu selesai", async () => {
    mockUseDoneJahitCards.mockReturnValue({
      cards: [
        { id: "c1", kode_produk: "D-038-KBR", size: "Midi", warna: "ABU", qty: 10, karyawan_nama: "Budi", done_at: "2026-09-10T00:00:00Z" },
      ],
      loading: false,
    });
    const user = userEvent.setup();
    render(<JahitDoneSection />);
    await user.click(screen.getByText("Arsip Selesai"));
    expect(screen.getByText("D-038-KBR")).toBeInTheDocument();
    expect(screen.getByText(/Midi · ABU · 10 pcs · Budi/)).toBeInTheDocument();
  });

  it("mengelompokkan kartu per kode (permintaan Denny 2026-09) — 1 header per kode, bukan diulang tiap baris", async () => {
    mockUseDoneJahitCards.mockReturnValue({
      cards: [
        { id: "c1", kode_produk: "D-041-STL", size: "Midi", warna: "ABU", qty: 9, karyawan_nama: "UCUNG", done_at: "2026-09-22T00:00:00Z" },
        { id: "c2", kode_produk: "D-042-LDN", size: "Midi", warna: "PINK", qty: 10, karyawan_nama: "DAYAT", done_at: "2026-09-22T00:00:00Z" },
        { id: "c3", kode_produk: "D-041-STL", size: "Midi", warna: "MAROON", qty: 9, karyawan_nama: "ANO", done_at: "2026-09-22T00:00:00Z" },
      ],
      loading: false,
    });
    const user = userEvent.setup();
    render(<JahitDoneSection />);
    await user.click(screen.getByText("Arsip Selesai"));
    // "D-041-STL" cuma muncul SEKALI sbg header (bukan 2x, walau ada 2 kartu)
    expect(screen.getAllByText("D-041-STL")).toHaveLength(1);
    expect(screen.getByText("D-042-LDN")).toBeInTheDocument();
    expect(screen.getByText("2 kartu")).toBeInTheDocument(); // grup D-041-STL
    expect(screen.getByText("1 kartu")).toBeInTheDocument(); // grup D-042-LDN
    expect(screen.getByText(/Midi · ABU · 9 pcs · UCUNG/)).toBeInTheDocument();
    expect(screen.getByText(/Midi · MAROON · 9 pcs · ANO/)).toBeInTheDocument();
  });

  it("mengirim search & tanggal ke hook saat diubah", async () => {
    const user = userEvent.setup();
    render(<JahitDoneSection />);
    await user.click(screen.getByText("Arsip Selesai"));
    await user.type(screen.getByPlaceholderText("Cari kode..."), "D-01");
    expect(mockUseDoneJahitCards).toHaveBeenCalledWith(
      expect.objectContaining({ search: "D-01" }),
      true,
    );
  });
});
