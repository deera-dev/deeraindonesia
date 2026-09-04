import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("./CartItem", () => ({
  default: ({ item, onRemove }) => (
    <div data-testid={`cart-item-${item.key}`}>
      <span>{item.kode}</span>
      <button onClick={onRemove} data-testid={`remove-${item.key}`}>hapus</button>
    </div>
  ),
}));
vi.mock("./BuyerInput", () => ({
  default: ({ value, onChange }) => (
    <input data-testid="buyer-input" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import CartPanel from "./CartPanel";

const emptyCartProps = {
  cart: [],
  subtotal: 0, diskon: 0, total: 0, totalItems: 0,
  editingPrice: null, buyerName: "", buyerHp: "", pelangganId: null,
  onBuyerNameChange: vi.fn(), onBuyerSelect: vi.fn(),
  showDiskon: false, diskonInput: "", diskonMode: "rp",
  onToggleDiskon: vi.fn(), onRemoveDiskon: vi.fn(),
  onDiskonInputChange: vi.fn(), onDiskonModeChange: vi.fn(),
  onSetEditingPrice: vi.fn(), onSavePrice: vi.fn(),
  onUpdateQty: vi.fn(), onRemoveItem: vi.fn(), onEditWarnaItem: vi.fn(),
  onReset: vi.fn(), onClose: vi.fn(),
  saving: false, onBayar: vi.fn(),
};

describe("CartPanel", () => {
  it("shows empty cart message when cart is empty", () => {
    render(<CartPanel {...emptyCartProps} />);
    expect(screen.getByText("Belum ada pesanan")).toBeInTheDocument();
  });

  it("shows Bayar button", () => {
    render(<CartPanel {...emptyCartProps} />);
    expect(screen.getByText("Bayar")).toBeInTheDocument();
  });

  it("Bayar button disabled when cart is empty", () => {
    render(<CartPanel {...emptyCartProps} />);
    expect(screen.getByText("Bayar")).toBeDisabled();
  });

  it("Bayar button enabled when cart has items", () => {
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} total={100000} totalItems={1} />);
    expect(screen.getByText("Bayar")).not.toBeDisabled();
  });

  it("calls onBayar when Bayar clicked", () => {
    const onBayar = vi.fn();
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} total={100000} totalItems={1} onBayar={onBayar} />);
    fireEvent.click(screen.getByText("Bayar"));
    expect(onBayar).toHaveBeenCalled();
  });

  it("shows ... when saving=true", () => {
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} saving={true} total={100000} />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("renders cart items", () => {
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} total={100000} totalItems={1} />);
    expect(screen.getByTestId("cart-item-D-01-Midi")).toBeInTheDocument();
  });

  it("shows total amount", () => {
    render(<CartPanel {...emptyCartProps} total={150000} />);
    expect(screen.getByText("150000")).toBeInTheDocument();
  });

  it("shows Pesanan header", () => {
    render(<CartPanel {...emptyCartProps} />);
    expect(screen.getByText("Pesanan")).toBeInTheDocument();
  });

  it("shows totalItems badge when > 0", () => {
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 2, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} totalItems={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows diskon section when showDiskon=true", () => {
    render(<CartPanel {...emptyCartProps} showDiskon={true} />);
    expect(screen.getByText("Diskon")).toBeInTheDocument();
  });

  it("shows subtotal and diskon breakdown when diskon>0", () => {
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} subtotal={100000} diskon={10000} total={90000} showDiskon={true} />);
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("calls onToggleDiskon when % button clicked (not showing diskon)", () => {
    const onToggleDiskon = vi.fn();
    render(<CartPanel {...emptyCartProps} onToggleDiskon={onToggleDiskon} />);
    fireEvent.click(screen.getByTitle("Tambah diskon"));
    expect(onToggleDiskon).toHaveBeenCalled();
  });

  it("shows Kosongkan button when cart has items", () => {
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} />);
    expect(screen.getByText("Kosongkan pesanan")).toBeInTheDocument();
  });

  it("calls onReset when Kosongkan clicked", () => {
    const onReset = vi.fn();
    const item = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    render(<CartPanel {...emptyCartProps} cart={[item]} onReset={onReset} />);
    fireEvent.click(screen.getByText("Kosongkan pesanan"));
    expect(onReset).toHaveBeenCalled();
  });

  // ── Tukar Tambah (permintaan Denny 2026-09) ────────────────────────────────
  // Entry point utk MEMULAI Tukar Tambah, dan banner status + tombol Batal,
  // sudah dipindah KELUAR dari CartPanel ke baris tersendiri di KasirPage
  // yang SELALU kelihatan (lihat KasirPage.test.jsx) — "jangan pakai tombol
  // pesanan melayang deh ... bikin tukar tambah ini di tempat lain aja biar
  // ga ganggu", lalu "ga ada info kalau ada produk yang di tukar tambah,
  // baru muncul ketika sudah ada di halaman pesanan". CartPanel sekarang
  // cuma tanggung jawab menampilkan baris breakdown "Retur" di atas Total
  // (bagian dari rincian harga) + label tombol Bayar.
  describe("Tukar Tambah", () => {
    const exchange = { originalSale: { buyer_name: "SITI" }, total: 200000 };

    it("tidak menampilkan apapun soal Tukar Tambah saat tidak ada exchange aktif", () => {
      render(<CartPanel {...emptyCartProps} />);
      expect(screen.queryByText(/Tukar Tambah/i)).not.toBeInTheDocument();
    });

    it("menampilkan baris Retur di atas Total saat exchange aktif", () => {
      const item = { key: "D-05-Gamis", kode: "D-05", size: "Gamis", harga: 210000, qty: 1, warna: null };
      render(<CartPanel {...emptyCartProps} cart={[item]} total={10000} exchange={exchange} />);
      expect(screen.getByText("Retur")).toBeInTheDocument();
      expect(screen.getByText(/200000/)).toBeInTheDocument();
      // Total (sudah bersih, dihitung KasirPage) tetap ditampilkan apa adanya
      expect(screen.getByText("10000")).toBeInTheDocument();
    });

    it("tidak lagi menampilkan banner status/nama pembeli asal atau tombol Batal (sudah pindah ke KasirPage)", () => {
      render(<CartPanel {...emptyCartProps} exchange={exchange} />);
      expect(screen.queryByText(/SITI/)).not.toBeInTheDocument();
      expect(screen.queryByText("Batal")).not.toBeInTheDocument();
    });

    it("tombol Bayar berlabel 'Proses Tukar Tambah' saat exchange aktif", () => {
      const item = { key: "D-05-Gamis", kode: "D-05", size: "Gamis", harga: 210000, qty: 1, warna: null };
      render(<CartPanel {...emptyCartProps} cart={[item]} total={10000} exchange={exchange} />);
      expect(screen.getByText("Proses Tukar Tambah")).toBeInTheDocument();
      expect(screen.queryByText("Bayar")).not.toBeInTheDocument();
    });
  });
});
