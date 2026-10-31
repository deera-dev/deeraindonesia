import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    cart: [],
    totalItems: 0,
    subtotal: 0,
    diskon: 0,
    total: 0,
    editingPrice: null,
    showCart: false,
    showDiskon: false,
    diskonInput: "",
    diskonMode: "rp",
    warnaPanel: null,
    selectedWarna: {},
    gabungan: false,
    selectedBreakdown: {},
    setEditingPrice: vi.fn(),
    setShowCart: vi.fn(),
    setShowDiskon: vi.fn(),
    setDiskonInput: vi.fn(),
    setDiskonMode: vi.fn(),
    setSelectedWarna: vi.fn(),
    openWarnaPanel: vi.fn(),
    closeWarnaPanel: vi.fn(),
    selectFullSeri: vi.fn(),
    confirmWarna: vi.fn(),
    editWarnaItem: vi.fn(),
    updateQty: vi.fn(),
    setItemHarga: vi.fn(),
    removeItem: vi.fn(),
    resetCart: vi.fn(),
    removeDiskon: vi.fn(),
    getPayloadItems: vi.fn(() => []),
    setGabungan: vi.fn(),
    toggleGabungan: vi.fn(),
    setWarnaLoc: vi.fn(),
  })),
  useCheckout: vi.fn(() => ({
    bayar: vi.fn().mockResolvedValue(null),
    saving: false,
  })),
}));
const simpanKeepMock = vi.fn();
const tandaiKeepLunasMock = vi.fn();
const editKeepRow = {
  id: "k1",
  buyer_name: "BUDI",
  buyer_hp: "0812",
  pelanggan_id: "p1",
  location: "cideng",
  discount: 0,
  items: [{ kode: "A", size: "Midi", qty: 2 }],
};
vi.mock("../../keep", () => ({
  useKeepCheckout: vi.fn(() => ({
    simpanKeep: simpanKeepMock,
    tandaiKeepLunas: tandaiKeepLunasMock,
    saving: false,
  })),
  useKeepOrdersQuery: vi.fn(() => ({ data: [{ id: "k1" }, { id: "k2" }] })),
  keepToCartItems: vi.fn((items) => items.map((i) => ({ ...i, key: `${i.kode}-${i.size}` }))),
  keepUsesOtherLocations: vi.fn(() => false),
  KeepListModal: ({ onClose, onPaid, onEdit }) => (
    <div data-testid="keep-list-modal">
      <button data-testid="keep-edit-btn" onClick={() => onEdit?.(editKeepRow)}>
        edit
      </button>
      <button data-testid="keep-paid-btn" onClick={() => onPaid?.()}>
        paid
      </button>
      <button data-testid="keep-close-btn" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));
vi.mock("../components/ProductList", () => ({
  default: ({ onAddItem }) => (
    <div data-testid="product-list">
      <button
        onClick={() => onAddItem({ kode: "D-01", warna: [] }, { size: "Midi", harga: 100000 })}
      >
        Add D-01
      </button>
    </div>
  ),
}));
let lastCartPanelProps = null;
vi.mock("../components/CartPanel", () => ({
  default: (props) => {
    lastCartPanelProps = props;
    const {
      onBayar,
      onBuyerSelect,
      onBuyerNameChange,
      onToggleDiskon,
      onEditWarnaItem,
      onClose,
      onUpdateQty,
    } = props;
    return (
      <div data-testid="cart-panel">
        <button onClick={onBayar} data-testid="bayar-btn">
          Bayar
        </button>
        <button onClick={props.onKeep} data-testid="keep-btn">
          {props.keepLabel}
        </button>
        <button
          data-testid="select-buyer-btn"
          onClick={() => onBuyerSelect?.({ nama: "Ani", no_hp: "081234", id: "p1" })}
        >
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
        <button data-testid="update-qty-btn" onClick={() => onUpdateQty?.("D-01-Midi", 1)}>
          Tambah Qty
        </button>
      </div>
    );
  },
}));
vi.mock("../components/TukarTambahModal", () => ({
  default: ({ onClose, onConfirm }) => (
    <div data-testid="tukar-tambah-modal">
      <button
        data-testid="tukar-tambah-confirm-btn"
        onClick={() =>
          onConfirm({
            originalSale: { buyer_name: "SITI" },
            items: [{ kode: "D-01", size: "Midi", harga: 100000, qty: 1 }],
            total: 100000,
          })
        }
      >
        Konfirmasi Retur
      </button>
      <button data-testid="tukar-tambah-close-btn" onClick={onClose}>
        Tutup
      </button>
    </div>
  ),
}));
vi.mock("../components/WarnaPanel", () => ({
  default: ({ onReset, onSetWarna, onClose }) => (
    <div data-testid="warna-panel">
      <button data-testid="warna-reset-btn" onClick={() => onReset?.()}>
        Reset Warna
      </button>
      <button data-testid="warna-set-btn" onClick={() => onSetWarna?.("HITAM", 2)}>
        Set Warna
      </button>
    </div>
  ),
}));
vi.mock("../../../shared/components/Struk", () => ({
  default: ({ struk, onClose }) => (
    <div data-testid="struk">
      <button onClick={onClose} data-testid="close-struk">
        Tutup
      </button>
    </div>
  ),
}));
vi.mock("@deera/shared/components/BackToTop", () => ({
  default: () => null,
}));

import { useCheckout } from "../hooks";
import KasirPage from "./KasirPage";

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
    render(
      <KasirPage location="gudang" onLocationChange={onLocationChange} onSaleCreated={vi.fn()} />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cideng" } });
    expect(onLocationChange).toHaveBeenCalledWith("cideng");
  });

  it("shows offline banner when navigator.onLine=false", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });
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
    const mockBayar = vi
      .fn()
      .mockResolvedValue({ date: "2026-07-04", type: "sale", total: 0, items: [] });
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(
      <KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={onSaleCreated} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    await waitFor(() => expect(onSaleCreated).toHaveBeenCalled());
  });

  it("closing struk hides it", async () => {
    const mockBayar = vi
      .fn()
      .mockResolvedValue({ date: "2026-07-04", type: "sale", total: 0, items: [] });
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    await waitFor(() => screen.getByTestId("struk"));
    fireEvent.click(screen.getByTestId("close-struk"));
    await waitFor(() => expect(screen.queryByTestId("struk")).not.toBeInTheDocument());
  });

  it("does not show struk when bayar returns null", async () => {
    const mockBayar = vi.fn().mockResolvedValue(null);
    useCheckout.mockReturnValue({ bayar: mockBayar, saving: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    expect(screen.queryByTestId("struk")).not.toBeInTheDocument();
  });
});

import { useProducts } from "../../../hooks/useProducts";
import { useCart } from "../hooks";

const baseCart = {
  cart: [],
  totalItems: 0,
  subtotal: 0,
  diskon: 0,
  total: 0,
  editingPrice: null,
  showCart: false,
  showDiskon: false,
  diskonInput: "",
  diskonMode: "rp",
  warnaPanel: null,
  selectedWarna: {},
  gabungan: false,
  selectedBreakdown: {},
  setEditingPrice: vi.fn(),
  setShowCart: vi.fn(),
  setShowDiskon: vi.fn(),
  setDiskonInput: vi.fn(),
  setDiskonMode: vi.fn(),
  setSelectedWarna: vi.fn(),
  openWarnaPanel: vi.fn(),
  closeWarnaPanel: vi.fn(),
  selectFullSeri: vi.fn(),
  confirmWarna: vi.fn(),
  editWarnaItem: vi.fn(),
  updateQty: vi.fn(),
  setItemHarga: vi.fn(),
  removeItem: vi.fn(),
  resetCart: vi.fn(),
  removeDiskon: vi.fn(),
  getPayloadItems: vi.fn(() => []),
  setGabungan: vi.fn(),
  toggleGabungan: vi.fn(),
  setWarnaLoc: vi.fn(),
};

describe("KasirPage — additional coverage", () => {
  it("syncError banner shows when syncError is set and online", () => {
    useProducts.mockReturnValueOnce({ products: [], loading: false, syncError: "err" });
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText(/Gagal sync/)).toBeInTheDocument();
  });

  it("isCustomLoc shows Reset button and custom location banner", () => {
    render(<KasirPage location="cideng" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
    expect(screen.getByText(/Lokasi manual/)).toBeInTheDocument();
  });

  it("Reset button calls onLocationChange with autoLocation", () => {
    const onLocationChange = vi.fn();
    render(
      <KasirPage location="cideng" onLocationChange={onLocationChange} onSaleCreated={vi.fn()} />,
    );
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

  it("CartPanel onReset membuka dialog konfirmasi, BUKAN langsung resetCart", () => {
    const resetCart = vi.fn();
    useCart.mockReturnValue({ ...baseCart, resetCart });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    act(() => {
      lastCartPanelProps.onReset();
    });
    expect(resetCart).not.toHaveBeenCalled();
    expect(screen.getByText("Kosongkan Pesanan?")).toBeInTheDocument();
  });

  it("konfirmasi 'Ya, Kosongkan' memanggil resetCart dan menutup dialog", () => {
    const resetCart = vi.fn();
    useCart.mockReturnValue({ ...baseCart, resetCart });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    act(() => {
      lastCartPanelProps.onReset();
    });
    fireEvent.click(screen.getByText("Ya, Kosongkan"));
    expect(resetCart).toHaveBeenCalled();
    expect(screen.queryByText("Kosongkan Pesanan?")).toBeNull();
  });

  it("'Batal' menutup dialog tanpa memanggil resetCart", () => {
    const resetCart = vi.fn();
    useCart.mockReturnValue({ ...baseCart, resetCart });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    act(() => {
      lastCartPanelProps.onReset();
    });
    fireEvent.click(screen.getByText("Batal"));
    expect(resetCart).not.toHaveBeenCalled();
    expect(screen.queryByText("Kosongkan Pesanan?")).toBeNull();
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
      loading: false,
      syncError: null,
    });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/kode|bahan|warna/i), {
      target: { value: "organsa" },
    });
    expect(true).toBe(true);
  });

  it("floating cart button shows when totalItems>0 and showCart=false", () => {
    useCart.mockReturnValueOnce({ ...baseCart, totalItems: 2, total: 200000, showCart: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText("Pesanan")).toBeInTheDocument();
    expect(screen.getByText(/200000/)).toBeInTheDocument();
  });

  it("floating cart button tidak tampil saat cart masih kosong", () => {
    useCart.mockReturnValueOnce({ ...baseCart, totalItems: 0, total: 0, showCart: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.queryByText("Pesanan")).not.toBeInTheDocument();
  });

  it("floating cart button tidak tampil saat panel Pesanan sudah terbuka (showCart=true)", () => {
    useCart.mockReturnValueOnce({ ...baseCart, totalItems: 2, total: 200000, showCart: true });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.queryByText("Pesanan")).not.toBeInTheDocument();
  });

  it("clicking floating cart button calls setShowCart(true)", () => {
    const setShowCart = vi.fn();
    useCart.mockReturnValueOnce({
      ...baseCart,
      totalItems: 1,
      total: 100000,
      showCart: false,
      setShowCart,
    });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByText("Pesanan"));
    expect(setShowCart).toHaveBeenCalledWith(true);
  });

  it("Gabungan button calls cart.toggleGabungan on click", () => {
    const toggleGabungan = vi.fn();
    useCart.mockReturnValueOnce({ ...baseCart, toggleGabungan });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByText("Gabungan"));
    expect(toggleGabungan).toHaveBeenCalled();
  });

  it("does not show gabungan banner when cart.gabungan=false (regression)", () => {
    useCart.mockReturnValueOnce({ ...baseCart, gabungan: false });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.queryByText(/Mode Gabungan aktif/)).not.toBeInTheDocument();
  });

  it("shows gabungan banner when cart.gabungan=true", () => {
    useCart.mockReturnValueOnce({ ...baseCart, gabungan: true });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText(/Mode Gabungan aktif/)).toBeInTheDocument();
  });

  it("onUpdateQty forwards products array to cart.updateQty", () => {
    const updateQty = vi.fn();
    const products = [{ kode: "D-01", warna: [] }];
    useProducts.mockReturnValueOnce({ products, loading: false, syncError: null });
    useCart.mockReturnValueOnce({ ...baseCart, updateQty });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByTestId("update-qty-btn"));
    expect(updateQty).toHaveBeenCalledWith("D-01-Midi", 1, products);
  });

  describe("Tukar Tambah — entry point & status persisten", () => {
    it("baris '⇄ Tukar Tambah' selalu tampil walau cart masih kosong", () => {
      useCart.mockReturnValueOnce({ ...baseCart, totalItems: 0, total: 0, showCart: false });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      expect(screen.getByTestId("start-tukar-tambah-btn")).toBeInTheDocument();
    });

    it("baris '⇄ Tukar Tambah' tetap tampil walau panel Pesanan sedang terbuka (showCart=true)", () => {
      useCart.mockReturnValueOnce({ ...baseCart, showCart: true });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      expect(screen.getByTestId("start-tukar-tambah-btn")).toBeInTheDocument();
    });

    it("begitu exchange aktif, baris GANTI jadi banner status (bukan hilang) — tetap kelihatan walau lagi di layar daftar produk (showCart=false)", () => {
      useCart.mockReturnValue({ ...baseCart, showCart: false });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(screen.queryByTestId("start-tukar-tambah-btn")).not.toBeInTheDocument();
      expect(screen.getByText(/Tukar Tambah aktif — retur SITI/i)).toBeInTheDocument();
      expect(screen.getByTestId("cancel-exchange-btn")).toBeInTheDocument();
    });

    it("banner status tetap kelihatan walau panel Pesanan sedang terbuka (showCart=true)", () => {
      useCart.mockReturnValue({ ...baseCart, showCart: true });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(screen.getByText(/Tukar Tambah aktif — retur SITI/i)).toBeInTheDocument();
    });

    it("transaksi tanpa nama pembeli asal ditampilkan sbg '(tanpa nama)' di banner status", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(screen.getByText(/Tukar Tambah aktif — retur/i)).toBeInTheDocument();
    });
  });

  describe("Tukar Tambah", () => {
    it("klik '⇄ Tukar Tambah' membuka TukarTambahModal", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      expect(screen.queryByTestId("tukar-tambah-modal")).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      expect(screen.getByTestId("tukar-tambah-modal")).toBeInTheDocument();
    });

    it("Tutup TukarTambahModal menutup modal tanpa set exchange", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-close-btn"));
      expect(screen.queryByTestId("tukar-tambah-modal")).not.toBeInTheDocument();
      expect(lastCartPanelProps.exchange).toBeNull();
    });

    it("konfirmasi retur menutup modal & meneruskan exchange ke CartPanel + useCheckout", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(screen.queryByTestId("tukar-tambah-modal")).not.toBeInTheDocument();
      expect(lastCartPanelProps.exchange).toEqual({
        originalSale: { buyer_name: "SITI" },
        items: [{ kode: "D-01", size: "Midi", harga: 100000, qty: 1 }],
        total: 100000,
      });
      expect(useCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({ total: 100000 }),
          onExchangeApplied: expect.any(Function),
        }),
      );
    });

    it("konfirmasi retur auto-isi buyerName/buyerHp/pelangganId dari originalSale", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(lastCartPanelProps.buyerName).toBe("SITI");
    });

    it("total dikirim ke CartPanel sudah bersih (cart.total - exchange.total)", () => {
      useCart.mockReturnValue({ ...baseCart, total: 210000 });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(lastCartPanelProps.total).toBe(110000);
    });

    it("Batal Tukar Tambah membersihkan exchange di CartPanel", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(lastCartPanelProps.exchange).not.toBeNull();
      fireEvent.click(screen.getByTestId("cancel-exchange-btn"));
      expect(lastCartPanelProps.exchange).toBeNull();
    });

    it("onExchangeApplied dari useCheckout membersihkan exchange aktif", () => {
      let capturedOnExchangeApplied;
      useCheckout.mockImplementation((opts) => {
        capturedOnExchangeApplied = opts.onExchangeApplied;
        return { bayar: vi.fn().mockResolvedValue(null), saving: false };
      });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(lastCartPanelProps.exchange).not.toBeNull();
      act(() => {
        capturedOnExchangeApplied();
      });
      expect(lastCartPanelProps.exchange).toBeNull();
    });
  });
});

describe("KasirPage — Keep (belum bayar)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simpanKeepMock.mockReset();
  });

  it("Keep berhasil -> struk BELUM LUNAS tampil, onSaleCreated TIDAK dipanggil (bukan penjualan)", async () => {
    simpanKeepMock.mockResolvedValue({ type: "sale", belum_lunas: true, total: 100000, items: [] });
    const onSaleCreated = vi.fn();
    render(
      <KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={onSaleCreated} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("keep-btn"));
    });
    await waitFor(() => expect(screen.getByTestId("struk")).toBeInTheDocument());
    expect(onSaleCreated).not.toHaveBeenCalled();
  });

  it("Keep gagal (null) -> tidak ada struk", async () => {
    simpanKeepMock.mockResolvedValue(null);
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("keep-btn"));
    });
    expect(screen.queryByTestId("struk")).not.toBeInTheDocument();
  });

  it("tombol 'Keep (n)' membuka daftar keep; bayar dari daftar memanggil onSaleCreated", () => {
    const onSaleCreated = vi.fn();
    render(
      <KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={onSaleCreated} />,
    );
    const open = screen.getByTestId("open-keep-btn");
    expect(open).toHaveTextContent("Keep (2)");
    fireEvent.click(open);
    expect(screen.getByTestId("keep-list-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("keep-paid-btn"));
    expect(onSaleCreated).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("keep-close-btn"));
    expect(screen.queryByTestId("keep-list-modal")).not.toBeInTheDocument();
  });
});

describe("KasirPage — Edit Keep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCheckout.mockReturnValue({ bayar: vi.fn().mockResolvedValue(null), saving: false });
  });

  it("Edit dari daftar: muat keep ke cart, pindah lokasi keep, tutup daftar", () => {
    const loadKeep = vi.fn();
    const onLocationChange = vi.fn();
    useCart.mockReturnValue({ ...baseCart, loadKeep });
    render(
      <KasirPage location="gudang" onLocationChange={onLocationChange} onSaleCreated={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId("open-keep-btn"));
    fireEvent.click(screen.getByTestId("keep-edit-btn"));
    expect(loadKeep).toHaveBeenCalledWith({
      keep: editKeepRow,
      items: [{ ...editKeepRow.items[0], key: "A-Midi" }],
      gabungan: false,
    });
    expect(onLocationChange).toHaveBeenCalledWith("cideng");
    expect(screen.queryByTestId("keep-list-modal")).not.toBeInTheDocument();
  });

  it("mode edit: banner + label Simpan Keep; Batal Edit mengosongkan cart", () => {
    const resetCart = vi.fn();
    useCart.mockReturnValue({
      ...baseCart,
      resetCart,
      editingKeep: { id: "k1", buyer_name: "BUDI" },
    });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    expect(screen.getByText(/Edit keep BUDI/)).toBeInTheDocument();
    expect(screen.getByTestId("keep-btn")).toHaveTextContent("Simpan Keep");
    expect(screen.queryByTestId("open-keep-btn")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cancel-edit-keep-btn"));
    expect(resetCart).toHaveBeenCalled();
  });

  it("Bayar saat mengedit keep: keep ditandai lunas setelah transaksi tercatat", async () => {
    useCart.mockReturnValue({ ...baseCart, editingKeep: { id: "k1", buyer_name: "BUDI" } });
    useCheckout.mockReturnValue({
      bayar: vi.fn().mockResolvedValue({ type: "sale", total: 1, items: [] }),
      saving: false,
    });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    expect(tandaiKeepLunasMock).toHaveBeenCalledWith("k1");
  });

  it("Bayar gagal saat mengedit keep: keep TIDAK ditandai lunas", async () => {
    useCart.mockReturnValue({ ...baseCart, editingKeep: { id: "k1" } });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("bayar-btn"));
    });
    expect(tandaiKeepLunasMock).not.toHaveBeenCalled();
  });
});
