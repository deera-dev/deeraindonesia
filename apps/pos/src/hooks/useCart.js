/**
 * useCart.js
 * Semua state dan logika keranjang belanja (cart) di halaman Kasir.
 *
 * Yang dikelola:
 * - Daftar item keranjang
 * - Warna panel (bottom sheet pilih warna/qty)
 * - State diskon (Rp atau %)
 * - Mobile toggle tampil/sembunyi cart
 * - Nilai computed: subtotal, diskon, total, totalItems
 *
 * Yang TIDAK dikelola (tetap di Kasir.jsx):
 * - Data pembeli (nama, HP, pelanggan_id)
 * - State saving/struk/successMsg
 * - Search dan tampilan foto/teks
 */
import { useState, useMemo } from "react";

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCart() {
  // Daftar item: { key, kode, size, harga, hpp, qty|warna, image }
  const [cart, setCart] = useState([]);

  // Key item yang sedang diedit harganya
  const [editingPrice, setEditingPrice] = useState(null);

  // Mobile: tampilkan panel cart (true) atau daftar produk (false)
  const [showCart, setShowCart] = useState(false);

  // Warna panel state
  const [warnaPanel, setWarnaPanel] = useState(null);     // { product, variant } | null
  const [selectedWarna, setSelectedWarna] = useState({}); // { [warnaName]: qty }

  // Diskon state
  const [showDiskon, setShowDiskon] = useState(false);
  const [diskonInput, setDiskonInput] = useState("");     // string angka mentah
  const [diskonMode, setDiskonMode] = useState("rp");     // "rp" | "persen"

  // ── Computed values ────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.harga * _qty(i), 0);
  const totalItems = cart.reduce((s, i) => s + _qty(i), 0);

  const diskon = useMemo(() => {
    const raw = parseInt(diskonInput.replace(/\D/g, "")) || 0;
    if (!showDiskon || raw === 0) return 0;
    if (diskonMode === "persen") return Math.round((subtotal * raw) / 100);
    return Math.min(raw, subtotal);
  }, [showDiskon, diskonInput, diskonMode, subtotal]);

  const total = subtotal - diskon;

  // ── Internal helper ────────────────────────────────────────────────────────
  function _qty(item) {
    return item.warna ? item.warna.reduce((s, w) => s + w.qty, 0) : (item.qty ?? 0);
  }

  // ── Cart actions ───────────────────────────────────────────────────────────

  /**
   * Buka panel pilih warna jika produk punya warna,
   * langsung tambah ke cart jika tidak punya warna.
   */
  function openWarnaPanel(product, variant) {
    if (!product.warna?.length) {
      _addSimple(product, variant);
      return;
    }
    const key = `${product.kode}-${variant.size}`;
    const existing = cart.find((i) => i.key === key);
    const prefill = {};
    if (existing?.warna) existing.warna.forEach((w) => { prefill[w.nama] = w.qty; });
    setSelectedWarna(prefill);
    setWarnaPanel({ product, variant });
  }

  /** Tutup warna panel tanpa menyimpan */
  function closeWarnaPanel() {
    setWarnaPanel(null);
    setSelectedWarna({});
  }

  /** Pilih semua warna (1 qty masing-masing) */
  function selectFullSeri() {
    if (!warnaPanel) return;
    const all = {};
    warnaPanel.product.warna.forEach((w) => { all[w] = 1; });
    setSelectedWarna(all);
  }

  /** Konfirmasi pilihan warna → masuk ke cart */
  function confirmWarna() {
    const items = Object.entries(selectedWarna)
      .filter(([, q]) => q > 0)
      .map(([nama, qty]) => ({ nama, qty }));
    if (!items.length) return;

    const { product, variant } = warnaPanel;
    const key = `${product.kode}-${variant.size}`;
    const entry = {
      key,
      kode: product.kode,
      size: variant.size,
      harga: variant.harga,
      hpp: product.hpp ?? 0,
      warna: items,
      qty: null,
      image: product.image,
    };

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
    closeWarnaPanel();
    setShowCart(true);
  }

  /**
   * Buka kembali warna panel untuk item yang sudah ada di cart.
   * @param {object} item  - item dari cart
   * @param {object[]} products - daftar produk (dari useProducts)
   */
  function editWarnaItem(item, products) {
    const product = products.find((p) => p.kode === item.kode);
    if (!product) return;
    const variant = (product.variants ?? []).find((v) => v.size === item.size);
    if (!variant) return;
    const prefill = {};
    (item.warna ?? []).forEach((w) => { prefill[w.nama] = w.qty; });
    setSelectedWarna(prefill);
    setWarnaPanel({ product, variant });
  }

  /** Ubah qty item simple (bukan warna) */
  function updateQty(key, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.key !== key || i.warna) return i;
          return { ...i, qty: Math.max(0, (i.qty ?? 0) + delta) };
        })
        .filter((i) => _qty(i) > 0),
    );
  }

  /** Set harga override satu item */
  function setItemHarga(key, newHarga) {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, harga: newHarga } : i)));
    setEditingPrice(null);
  }

  /** Hapus satu item dari cart */
  function removeItem(key) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  /** Reset seluruh cart + diskon (dipanggil setelah transaksi berhasil) */
  function resetCart() {
    setCart([]);
    setShowCart(false);
    setShowDiskon(false);
    setDiskonInput("");
    setDiskonMode("rp");
  }

  /** Hapus diskon saja */
  function removeDiskon() {
    setShowDiskon(false);
    setDiskonInput("");
  }

  /**
   * Ambil item cart yang siap dikirim ke useSales
   * (tanpa field 'key' dan 'image' yang hanya untuk UI).
   */
  function getPayloadItems() {
    return cart.map(({ key: _k, image: _img, ...rest }) => rest);
  }

  // ── Private: add simple item (no warna) ───────────────────────────────────
  function _addSimple(product, variant) {
    const key = `${product.kode}-${variant.size}`;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty ?? 0) + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          kode: product.kode,
          size: variant.size,
          harga: variant.harga,
          hpp: product.hpp ?? 0,
          qty: 1,
          warna: null,
          image: product.image,
        },
      ];
    });
    setShowCart(true);
  }

  return {
    // State
    cart,
    editingPrice, setEditingPrice,
    showCart, setShowCart,
    warnaPanel, selectedWarna, setSelectedWarna,
    showDiskon, setShowDiskon,
    diskonInput, setDiskonInput,
    diskonMode, setDiskonMode,
    // Computed
    subtotal, diskon, total, totalItems,
    // Actions
    openWarnaPanel, closeWarnaPanel, selectFullSeri, confirmWarna,
    editWarnaItem, updateQty, setItemHarga, removeItem,
    resetCart, removeDiskon, getPayloadItems,
  };
}
