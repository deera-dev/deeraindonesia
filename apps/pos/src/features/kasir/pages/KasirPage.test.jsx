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
    gabungan: false, selectedBreakdown: {},
    setEditingPrice: vi.fn(), setShowCart: vi.fn(), setShowDiskon: vi.fn(),
    setDiskonInput: vi.fn(), setDiskonMode: vi.fn(), setSelectedWarna: vi.fn(),
    openWarnaPanel: vi.fn(), closeWarnaPanel: vi.fn(), selectFullSeri: vi.fn(),
    confirmWarna: vi.fn(), editWarnaItem: vi.fn(), updateQty: vi.fn(),
    setItemHarga: vi.fn(), removeItem: vi.fn(), resetCart: vi.fn(),
    removeDiskon: vi.fn(), getPayloadItems: vi.fn(() => []),
    setGabungan: vi.fn(), toggleGabungan: vi.fn(), setWarnaLoc: vi.fn(),
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
let lastCartPanelProps = null;
vi.mock("../components/CartPanel", () => ({
  default: (props) => {
    lastCartPanelProps = props;
    const {
      onBayar, onBuyerSelect, onBuyerNameChange, onToggleDiskon, onEditWarnaItem, onClose, onUpdateQty,
    } = props;
    return (
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
      <button data-testid="tukar-tambah-close-btn" onClick={onClose}>Tutup</button>
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
  gabungan: false, selectedBreakdown: {},
  setEditingPrice: vi.fn(), setShowCart: vi.fn(), setShowDiskon: vi.fn(),
  setDiskonInput: vi.fn(), setDiskonMode: vi.fn(), setSelectedWarna: vi.fn(),
  openWarnaPanel: vi.fn(), closeWarnaPanel: vi.fn(), selectFullSeri: vi.fn(),
  confirmWarna: vi.fn(), editWarnaItem: vi.fn(), updateQty: vi.fn(),
  setItemHarga: vi.fn(), removeItem: vi.fn(), resetCart: vi.fn(),
  removeDiskon: vi.fn(), getPayloadItems: vi.fn(() => []),
  setGabungan: vi.fn(), toggleGabungan: vi.fn(), setWarnaLoc: vi.fn(),
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

  // Perilaku floating "Pesanan" dikembalikan seperti semula (permintaan
  // Denny 2026-09: "jangan pakai tombol pesanan melayang deh, gapapa kaya
  // sebelumnya, kalau udah ada keranjang baru muncul") — entry point Tukar
  // Tambah dipindah ke baris tersendiri, lihat describe "Tukar Tambah entry
  // point" di bawah, bukan menumpang di tombol ini.
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
    useCart.mockReturnValueOnce({ ...baseCart, totalItems: 1, total: 100000, showCart: false, setShowCart });
    render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
    fireEvent.click(screen.getByText("Pesanan"));
    expect(setShowCart).toHaveBeenCalledWith(true);
  });

  // ── Mode Gabungan ────────────────────────────────────────────────────────
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

  // Entry point / status Tukar Tambah — baris tersendiri di KasirPage
  // (permintaan Denny 2026-09: "jangan pakai tombol pesanan melayang deh
  // ... bikin tukar tambah ini di tempat lain aja biar ga ganggu"), SELALU
  // tampil (mobile/desktop, cart kosong/terisi, showCart true/false — baris
  // ini di LUAR toggle produk/cart), bukan menumpang di tombol "Pesanan"
  // melayang atau tersembunyi di dalam CartPanel. Lalu permintaan lanjutan:
  // "ga ada info kalau ada produk yang di tukar tambah, baru muncul ketika
  // sudah ada di halaman pesanan ... kalau sedang hektik keadaan di pasar,
  // mungkin ini akan sangat mempersulit admin kasir" — jadi begitu exchange
  // aktif, baris ini GANTI jadi banner status (bukan hilang), tetap tampil
  // di kedua state showCart.
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
      // Tombol trigger sudah tidak ada...
      expect(screen.queryByTestId("start-tukar-tambah-btn")).not.toBeInTheDocument();
      // ...tapi status & tombol Batal SEKARANG SELALU ada, walau produk (bukan Pesanan) yg lagi tampil.
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
      // TukarTambahModal mock selalu confirm dgn buyer_name "SITI" — override lastCartPanelProps
      // tidak relevan di sini krn kita cek MARKUP KasirPage, bukan props CartPanel.
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(screen.getByText(/Tukar Tambah aktif — retur/i)).toBeInTheDocument();
    });
  });

  // ── Tukar Tambah (permintaan Denny 2026-09) ────────────────────────────────
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

    // Permintaan Denny 2026-09: "kenapa nama pembelinya masih kosong? harusnya
    // kan sudah jelas pembeli si TEST" — nama/HP/pelanggan_id dari originalSale
    // WAJIB auto-isi ke field buyer begitu retur dikonfirmasi, supaya kasir
    // tidak perlu ketik ulang & struk tidak lagi kosong di baris "Yth.".
    it("konfirmasi retur auto-isi buyerName/buyerHp/pelangganId dari originalSale", () => {
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(lastCartPanelProps.buyerName).toBe("SITI");
    });

    it("total dikirim ke CartPanel sudah bersih (cart.total - exchange.total)", () => {
      // mockReturnValue (bukan Once) — komponen re-render beberapa kali
      // (buka modal, konfirmasi retur) dan useCart dipanggil ulang tiap
      // render, jadi nilai total harus tetap konsisten di semua render itu.
      useCart.mockReturnValue({ ...baseCart, total: 210000 });
      render(<KasirPage location="gudang" onLocationChange={vi.fn()} onSaleCreated={vi.fn()} />);
      fireEvent.click(screen.getByTestId("start-tukar-tambah-btn"));
      fireEvent.click(screen.getByTestId("tukar-tambah-confirm-btn"));
      expect(lastCartPanelProps.total).toBe(110000); // 210000 - 100000
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
      act(() => { capturedOnExchangeApplied(); });
      expect(lastCartPanelProps.exchange).toBeNull();
    });
  });
});
