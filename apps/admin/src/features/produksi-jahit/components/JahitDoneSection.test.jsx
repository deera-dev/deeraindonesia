import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
        {
          id: "c1",
          kode_produk: "D-038-KBR",
          size: "Midi",
          warna: "ABU",
          qty: 10,
          karyawan_nama: "Budi",
          done_at: "2026-09-10T00:00:00Z",
        },
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
        {
          id: "c1",
          kode_produk: "D-041-STL",
          size: "Midi",
          warna: "ABU",
          qty: 9,
          karyawan_nama: "UCUNG",
          done_at: "2026-09-22T00:00:00Z",
        },
        {
          id: "c2",
          kode_produk: "D-042-LDN",
          size: "Midi",
          warna: "PINK",
          qty: 10,
          karyawan_nama: "DAYAT",
          done_at: "2026-09-22T00:00:00Z",
        },
        {
          id: "c3",
          kode_produk: "D-041-STL",
          size: "Midi",
          warna: "MAROON",
          qty: 9,
          karyawan_nama: "ANO",
          done_at: "2026-09-22T00:00:00Z",
        },
      ],
      loading: false,
    });
    const user = userEvent.setup();
    render(<JahitDoneSection />);
    await user.click(screen.getByText("Arsip Selesai"));
    expect(screen.getAllByText("D-041-STL")).toHaveLength(1);
    expect(screen.getByText("D-042-LDN")).toBeInTheDocument();
    expect(screen.getByText("2 kartu")).toBeInTheDocument();
    expect(screen.getByText("1 kartu")).toBeInTheDocument();
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

  describe("cetak ulang kartu dari arsip", () => {
    const doneCards = [
      {
        id: "c1",
        kode_produk: "D-040-STL",
        size: "Midi",
        warna: "ABU",
        qty: 9,
        done_at: "2026-10-24T00:00:00Z",
      },
      {
        id: "c2",
        kode_produk: "D-040-STL",
        size: "Midi",
        warna: "HITAM",
        qty: 9,
        done_at: "2026-10-24T00:00:00Z",
      },
    ];

    it("tanpa onPrint/onPrintGroup tidak ada tombol cetak", async () => {
      mockUseDoneJahitCards.mockReturnValue({ cards: doneCards, loading: false });
      const user = userEvent.setup();
      render(<JahitDoneSection />);
      await user.click(screen.getByText("Arsip Selesai"));
      expect(screen.queryByText(/Cetak semua/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Cetak kartu/)).not.toBeInTheDocument();
    });

    it("Cetak semua per kode memanggil onPrintGroup dgn semua kartu kode itu; tombol per kartu memanggil onPrint", async () => {
      mockUseDoneJahitCards.mockReturnValue({ cards: doneCards, loading: false });
      const onPrint = vi.fn();
      const onPrintGroup = vi.fn();
      const user = userEvent.setup();
      render(<JahitDoneSection onPrint={onPrint} onPrintGroup={onPrintGroup} />);
      await user.click(screen.getByText("Arsip Selesai"));
      await user.click(screen.getByText("🖶 Cetak semua"));
      expect(onPrintGroup).toHaveBeenCalledWith(doneCards);
      await user.click(screen.getByLabelText("Cetak kartu D-040-STL Midi HITAM"));
      expect(onPrint).toHaveBeenCalledWith(doneCards[1]);
    });
  });
});
