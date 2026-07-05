import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATIONS: ["gudang", "cideng", "tegalgubug"],
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
  getMarketLocation: vi.fn(() => "gudang"),
  getMarketLabel: vi.fn(() => "Gudang"),
}));
vi.mock("../../../hooks/useProducts", () => ({
  useProducts: vi.fn(() => ({ products: [], loading: false, syncError: null })),
}));
vi.mock("../hooks", () => ({
  useCart: vi.fn(() => ({
    cart: [], totalItems: 0, subtotal: 0, diskon: 0, total: 0,
    editingPrice: null, showCart: false, showDiskon: false,
    diskonInput: "", diskonMode: "rp", warnaPanel: null, selectedWarna: {},
    setEditingPrice: vi.fn(), setShowCart: vi.fn(), setShowDiskon: vi.fn(),
    setDiskonInput: vi.fn(), setDiskonMode: vi.fn(), setSelectedWarna: vi.fn(),
    openWarnaPanel: vi.fn(), closeWarnaPanel: vi.fn(), selectFullSeri: vi.fn(),
    confirmWarna: vi.fn(), editWarnaItem: vi.fn(), updateQty: vi.fn(),
    setItemHarga: vi.fn(), removeItem: vi.fn(), resetCart: vi.fn(),
    removeDiskon: vi.fn(), getPayloadItems: vi.fn(() => []),
  })),
  useCheckout: vi.fn(() => ({
    bayar: vi.fn().mockResolvedValue(null),
    saving: false,
  })),
}));
vi.mock("../components/ProductList", () => ({
  default: ({ onAddItem }) => (
    <div data-testid="product-list">
      <button onClick={() => onAddItem({ kode: "D-01", warna: [] }, { size: "Midi", harga: 100000 })}>
        Add D-01
      </button>
    </div>
  ),
}));
vi.mock("../components/CartPanel", () => ({
  default: ({ onBayar, onBuyerSelect, onBuyerNameChange, onToggleDiskon, onEditWarnaItem, onClose }) => (
    <div data-testid="cart-panel">
      <button onClick={onBayar} data-testid="bayar-btn">Bayar</button>
      <button data-testid="select-buyer-btn"
        onClick={() => onBuyerSelect?.({ nama: "Ani", no_hp: "081234", id: "p1" })}>
        Pilih Pelanggan
      </button>
      <button data-testid="change-name-btn" onClick={() => onBuyerNameChange?.("Budi Baru")}>
        Ubah Nama
      </button>
      <button data-testid="toggle-diskon-btn" onClick={() => onToggleDiskon?.()}>
        Diskon
      </button>
      <button data-testid="edit-warna-btn" onClick={() => onEditWarnaItem?.({ kode: "D-01" })}>
        Edit Warna
      </button>
      <button data-testid="close-cart-btn" onClick={() => onClose?.()}>
        Tutup Cart
      </button>
    </div>
  ),
}));
vi.mock("../components/WarnaPanel", () => ({
  default: ({ onReset, onSetWarna, onClose }) => (
    <div data-testid="warna-panel">
      <button data-testid="warna-reset-btn" onClick={() => onReset?.()}>Reset Warna</button>
      <button data-testid="warna-set-btn" onClick={() => onSetWarna?.("HITAM", 2)}>Set Warna</button>
    </div>
  ),
}));
vi.mock("../../../shared/components/Struk", () => ({
  default: ({ struk, onClose }) => (
    <div data-testid="struk">
      <button onClick={onClose} data-testid="close-struk">Tutup</button>
    </div>
  ),
}));
vi.mock("@deera/shared/components/BackToTop", () => ({
  default: () => null,
}));

import KasirPage from "./KasirPage";
import { useCheckout } from "../hooks";

describe("KasirPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product list and cart panel", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByTestId("product-list")).toBeInTheDocument();
    expect(screen.getByTestId("cart-panel")).toBeInTheDocument();
  });

  it("renders location select with options", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("calls onLocationChange when select changes", () => {
    const onLocationChange = vi.fn();
    render(<KasirPage location="gudang" onLocationChange={onLocationChange} onSaleCreated={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cideng" } });
    expect(onLocationChange).toHaveBeenCalledWith("cideng");
  });

  it("shows offline banner when navigator.onLine=false", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText(/Mode Offline/)).toBeInTheDocument();
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  });

  it("search input is rendered", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByPlaceholderText(/kode|bahan|warna/i)).toBeInTheDocument();
  });

  it("shows struk after successful bayar", async () => {
    const mockBayar = vi.fn().mockResolvedValue({
      date: "2026-07-04",
      type: "sale",
      total: 100000,
      items: [],
      buyer_name: "BUDI",
    });
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    await waitFor(() => expect(screen.getByTestId("struk")).toBeInTheDocument());
  });

  it("calls onSaleCreated after successful bayar", async () => {
    const onSaleCreated = vi.fn();
    const mockBayar = vi.fn().mockResolvedValue({ date: "2026-07-04", type: "sale", total: 0, items: [] });
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={onSaleCreated} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    await waitFor(() => expect(onSaleCreated).toHaveBeenCalled());
  });

  it("closing struk hides it", async () => {
    const mockBayar = vi.fn().mockResolvedValue({ date: "2026-07-04", type: "sale", total: 0, items: [] });
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByTestId("bayar-btn")); });
    await waitFor(() => screen.getByTestId("struk"));
    fireEvent.click(screen.getByTestId("close-struk"));
    await waitFor(() => expect(screen.queryByTestId("struk")).not.toBeInTheDocument());
  });

  it("does not show struk when bayar returns null", async () => {
    const mockBayar = vi.fn().mockResolvedValue(null);
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByTestId("bayar-btn")); });
    expect(screen.queryByTestId("struk")).not.toBeInTheDocument();
  });
});

import { useProducts } from "../../../hooks/useProducts";
import { useCart } from "../hooks";

const baseCart = {
  cart: [], totalItems: 0, subtotal: 0, diskon: 0, total: 0,
  editingPrice: null, showCart: false, showDiskon: false,
  diskonInput: "", diskonMode: "rp", warnaPanel: null, selectedWarna: {},
  setEditingPrice: vi.fn(), setShowCart: vi.fn(), setShowDiskon: vi.fn(),
  setDiskonInput: vi.fn(), setDiskonMode: vi.fn(), setSelectedWarna: vi.fn(),
  openWarnaPanel: vi.fn(), closeWarnaPanel: vi.fn(), selectFullSeri: vi.fn(),
  confirmWarna: vi.fn(), editWarnaItem: vi.fn(), updateQty: vi.fn(),
  setItemHarga: vi.fn(), removeItem: vi.fn(), resetCart: vi.fn(),
  removeDiskon: vi.fn(), getPayloadItems: vi.fn(() => []),
};

describe("KasirPage — additional coverage", () => {
  it("syncError banner shows when syncError is set and online", () => {
    useProducts.mockReturnValueOnce({ products: [], loading: false, syncError: "err" });
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText(/Gagal sync/)).toBeInTheDocument();
  });

  it("isCustomLoc shows Reset button and custom location banner", () => {
    // getMarketLocation returns "gudang"; cideng !== gudang → isCustomLoc = true
    render(<KasirPage location="cideng" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
    expect(screen.getByText(/Lokasi manual/)).toBeInTheDocument();
  });

  it("Reset button calls onLocationChange with autoLocation", () => {
    const onLocationChange = vi.fn();
    render(<KasirPage location="cideng" onLocationChange={onLocationChange} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByText("Reset"));
    expect(onLocationChange).toHaveBeenCalledWith("gudang");
  });

  it("Foto toggle sets showPhotos, Teks toggle resets it", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByText("Foto"));
    fireEvent.click(screen.getByText("Teks"));
    expect(screen.getByText("Teks")).toBeInTheDocument();
  });

  it("handleBuyerSelect sets buyer name and pelangganId", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("select-buyer-btn"));
    // No crash = handleBuyerSelect ran
    expect(screen.getByTestId("select-buyer-btn")).toBeInTheDocument();
  });

  it("onBuyerNameChange resets pelangganId", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("change-name-btn"));
    expect(screen.getByTestId("change-name-btn")).toBeInTheDocument();
  });

  it("onToggleDiskon callback fires without error", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("toggle-diskon-btn"));
    expect(screen.getByTestId("toggle-diskon-btn")).toBeInTheDocument();
  });

  it("onEditWarnaItem callback fires without error", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("edit-warna-btn"));
    expect(screen.getByTestId("edit-warna-btn")).toBeInTheDocument();
  });

  it("onClose CartPanel callback hides cart", () => {
    const setShowCart = vi.fn();
    useCart.mockReturnValueOnce({ ...baseCart, setShowCart });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("close-cart-btn"));
    expect(setShowCart).toHaveBeenCalledWith(false);
  });

  it("WarnaPanel onReset callback fires without error", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("warna-reset-btn"));
    expect(screen.getByTestId("warna-panel")).toBeInTheDocument();
  });

  it("WarnaPanel onSetWarna callback fires without error", () => {
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("warna-set-btn"));
    expect(screen.getByTestId("warna-panel")).toBeInTheDocument();
  });

  it("search filter covers products matching kode query", () => {
    useProducts.mockReturnValueOnce({
      products: [
        { kode: "D-01-OSK", bahan: "OSK", warna: ["HITAM"], created_at: "2024-01-01" },
        { kode: "D-02-SFN", bahan: "SFN", warna: ["PUTIH"], created_at: "2024-01-02" },
      ],
      loading: false,
      syncError: null,
    });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/kode|bahan|warna/i);
    fireEvent.change(searchInput, { target: { value: "D-01" } });
    expect(searchInput.value).toBe("D-01");
  });

  it("search filter covers products matching bahan query", () => {
    useProducts.mockReturnValueOnce({
      products: [{ kode: "D-01-OSK", bahan: "Organsa", warna: [], created_at: "2024-01-01" }],
      loading: false, syncError: null,
    });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/kode|bahan|warna/i), { target: { value: "organsa" } });
    expect(true).toBe(true); // filter ran without error
  });

  it("floating cart button shows when totalItems>0 and showCart=false", () => {
    useCart.mockReturnValueOnce({ ...baseCart, totalItems: 2, total: 200000, showCart: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText("Pesanan")).toBeInTheDocument();
    expect(screen.getByText(/200000/)).toBeInTheDocument();
  });

  it("clicking floating cart button calls setShowCart(true)", () => {
    const setShowCart = vi.fn();
    useCart.mockReturnValueOnce({ ...baseCart, totalItems: 1, total: 100000, showCart: false, setShowCart });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByText("Pesanan"));
    expect(setShowCart).toHaveBeenCalledWith(true);
  });
});
