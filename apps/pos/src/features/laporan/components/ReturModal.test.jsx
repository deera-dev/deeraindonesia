import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang" },
}));

import ReturModal from "./ReturModal";

const sale = {
  id: "s1", type: "sale", location: "gudang",
  items: [
    { kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 2, warna: null },
  ],
};

describe("ReturModal", () => {
  it("shows Retur Barang header", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    expect(screen.getByText("Retur Barang")).toBeInTheDocument();
  });

  it("shows item kode", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<ReturModal sale={sale} onClose={onClose} onConfirm={vi.fn()} saving={false} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Konfirmasi Retur button disabled when no items selected", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    const btn = screen.getByText(/Konfirmasi Retur/i);
    expect(btn).toBeDisabled();
  });

  it("calls onConfirm after incrementing qty with + button", () => {
    const onConfirm = vi.fn();
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={onConfirm} saving={false} />);
    // click + to increment qty from 0 to 1
    const plusBtns = screen.getAllByLabelText("Tambah");
    fireEvent.click(plusBtns[0]);
    // Konfirmasi Retur is now enabled
    fireEvent.click(screen.getByText(/Konfirmasi Retur/i));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows saving text when saving=true", () => {
    render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={true} />);
    expect(screen.getByText("Memproses...")).toBeInTheDocument();
  });

  it("warna item: shows warna list", () => {
    const saleWarna = {
      ...sale,
      items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, warna: [{ nama: "HITAM", qty: 2 }, { nama: "MERAH", qty: 1 }] }],
    };
    render(<ReturModal sale={saleWarna} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  // ── Diskon transaksi asal HARUS dialokasikan proporsional ke retur ────────
  // Bug dilaporkan Denny 2026-09: "transaksi si TEST tertulis 140.000,
  // padahal ada diskon 40.000 jadi totalnya 100.000 — tapi pas retur
  // nilainya masih 140.000, bisa bikin toko rugi."
  describe("diskon transaksi asal dialokasikan proporsional ke retur", () => {
    const saleWithDiscount = {
      id: "s2", type: "sale", location: "gudang", discount: 40000,
      items: [{ kode: "D-33", size: "Midi", harga: 140000, hpp: 100000, qty: 1, warna: null }],
    };

    it("onConfirm menerima returTotal & item.harga yg SUDAH bersih (dikurangi proporsi diskon), bukan harga kotor", () => {
      const onConfirm = vi.fn();
      render(<ReturModal sale={saleWithDiscount} onClose={vi.fn()} onConfirm={onConfirm} saving={false} />);
      fireEvent.click(screen.getAllByLabelText("Tambah")[0]); // qty 0 -> 1 (retur semua)
      fireEvent.click(screen.getByText(/Konfirmasi Retur/i));
      // Subtotal asli 140.000, diskon 40.000 -> rasio 40000/140000, harga
      // bersih per unit = 140000 * (1 - 40000/140000) = 100000 (BUKAN 140000).
      expect(onConfirm).toHaveBeenCalledWith(
        [expect.objectContaining({ harga: 100000, qty: 1 })],
        100000,
      );
    });

    it("footer 'Total retur' menampilkan nilai bersih (100000), bukan harga kotor (140000)", () => {
      render(<ReturModal sale={saleWithDiscount} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
      fireEvent.click(screen.getAllByLabelText("Tambah")[0]);
      // "Rp " dan "100000" adalah dua text node terpisah (JSX expression),
      // cek via parent container "Total retur" bukan getByText exact string.
      const label = screen.getByText("Total retur");
      const row = label.closest("div");
      expect(row).toHaveTextContent("Rp 100000");
      expect(row).not.toHaveTextContent("140000");
    });

    it("menampilkan catatan penjelas diskon saat transaksi asal punya diskon", () => {
      render(<ReturModal sale={saleWithDiscount} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
      fireEvent.click(screen.getAllByLabelText("Tambah")[0]);
      expect(screen.getByText(/Sudah dikurangi proporsi diskon transaksi asal/i)).toBeInTheDocument();
    });

    it("TIDAK menampilkan catatan diskon kalau transaksi asal tidak ada diskon", () => {
      render(<ReturModal sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} saving={false} />);
      fireEvent.click(screen.getAllByLabelText("Tambah")[0]);
      expect(screen.queryByText(/Sudah dikurangi proporsi diskon/i)).not.toBeInTheDocument();
    });
  });
});
