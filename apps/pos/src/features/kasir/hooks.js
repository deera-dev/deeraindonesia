/**
 * features/kasir/hooks.js — Public surface fitur kasir (Dependency Inversion
 * ala React). Komponen & halaman import HANYA dari sini / index.js.
 *
 * useCart
 *   Semua state dan logika keranjang belanja (cart) di halaman Kasir.
 *   Yang dikelola: daftar item keranjang, warna panel (bottom sheet pilih
 *   warna/qty), state diskon (Rp atau %), mobile toggle tampil/sembunyi
 *   cart, nilai computed (subtotal, diskon, total, totalItems), dan mode
 *   "Gabungan" (ambil stok lintas lokasi dalam satu transaksi — lihat
 *   komentar di atas `gabungan` di bawah).
 *   Yang TIDAK dikelola (tetap di KasirPage): data pembeli (nama, HP,
 *   pelanggan_id), state struk, search dan tampilan foto/teks.
 *
 * useCheckout
 *   Diekstrak dari pages/Kasir.jsx (CLAUDE.md §13: "Jangan taruh logika
 *   bisnis di halaman"). Mengorkestrasi proses bayar: auto-resolve/buat
 *   pelanggan baru dari nama buyer, panggil useCreateSale (fitur penjualan),
 *   susun payload struk, reset cart, toast + notifikasi. Halaman hanya
 *   memanggil `bayar()` dan menangani hasil (tampilkan struk, reset field
 *   buyer lokal).
 */
import { useState, useMemo } from "react";
import { LOCATIONS } from "@deera/shared/lib/marketDay";
import {
  getStokWarna,
  getStokAllLocations,
  getCombinedStok,
  allocateAcrossLocations,
} from "../../shared/lib/salesUtils";
import { useCreateSale } from "../penjualan";
import { searchPelanggan, addPelanggan } from "../pelanggan";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { useTransactionNotification } from "../../shared/hooks/useTransactionNotification";
import { toast } from "@deera/shared/features/toast/hooks";

// Konversi array breakdown [{location, qty}] → map {location: qty}
function breakdownArrToMap(breakdown) {
  if (!Array.isArray(breakdown)) return {};
  return breakdown.reduce((acc, b) => {
    acc[b.location] = b.qty;
    return acc;
  }, {});
}

// ── useCart ─────────────────────────────────────────────────────────────────
export function useCart(location) {
  // Daftar item: { key, kode, size, harga, hpp, qty|warna, image, breakdown? }
  const [cart, setCart] = useState([]);

  // Key item yang sedang diedit harganya
  const [editingPrice, setEditingPrice] = useState(null);

  // Mobile: tampilkan panel cart (true) atau daftar produk (false)
  const [showCart, setShowCart] = useState(false);

  // Warna panel state
  const [warnaPanel, setWarnaPanel] = useState(null); // { product, variant } | null
  const [selectedWarna, setSelectedWarna] = useState({}); // { [warnaName]: qty }

  // "Gabungan" — saat aktif, kasir bisa ambil kekurangan stok dari lokasi
  // lain (selain lokasi aktif) dalam SATU transaksi. Saat non-aktif,
  // perilaku 100% sama seperti sebelum fitur ini ada (cap di stok lokasi
  // aktif saja, tanpa breakdown lintas lokasi).
  const [gabungan, setGabungan] = useState(false);
  // Breakdown per warna saat gabungan aktif: { [warnaName]: {gudang, cideng, tegalgubug} }
  const [selectedBreakdown, setSelectedBreakdown] = useState({});

  // Diskon state
  const [showDiskon, setShowDiskon] = useState(false);
  const [diskonInput, setDiskonInput] = useState(""); // string angka mentah
  const [diskonMode, setDiskonMode] = useState("rp"); // "rp" | "persen"

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
    return Array.isArray(item.warna) ? item.warna.reduce((s, w) => s + (w.qty ?? 0), 0) : (item.qty ?? 0);
  }

  function toggleGabungan() {
    setGabungan((v) => !v);
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
    const prefillBreakdown = {};
    if (existing?.warna)
      existing.warna.forEach((w) => {
        prefill[w.nama] = w.qty;
        if (Array.isArray(w.breakdown) && w.breakdown.length > 0) {
          prefillBreakdown[w.nama] = breakdownArrToMap(w.breakdown);
        }
      });
    setSelectedWarna(prefill);
    setSelectedBreakdown(prefillBreakdown);
    setWarnaPanel({ product, variant });
  }

  /** Tutup warna panel tanpa menyimpan */
  function closeWarnaPanel() {
    setWarnaPanel(null);
    setSelectedWarna({});
    setSelectedBreakdown({});
  }

  /** Pilih semua warna — +1 per klik, skip warna stok=0, cap di stok tersedia */
  function selectFullSeri() {
    if (!warnaPanel) return;

    if (!gabungan) {
      const next = { ...selectedWarna };
      warnaPanel.product.warna.forEach((w) => {
        const stok = getStokWarna(warnaPanel.product, warnaPanel.variant.size, w, location);
        if (stok <= 0) return; // skip warna habis
        const newQty = (selectedWarna[w] ?? 0) + 1;
        next[w] = Math.min(stok, newQty); // cap di stok
      });
      setSelectedWarna(next);
      return;
    }

    // Mode gabungan: batas stok = kombinasi 3 lokasi, alokasi +1 lewat
    // allocateAcrossLocations (primary = lokasi aktif, sisanya lokasi lain).
    const nextWarna = { ...selectedWarna };
    const nextBreakdown = { ...selectedBreakdown };
    warnaPanel.product.warna.forEach((w) => {
      const combinedStok = getCombinedStok(warnaPanel.product, warnaPanel.variant.size, w);
      if (combinedStok <= 0) return; // skip warna habis di semua lokasi

      const currentTotal = selectedWarna[w] ?? 0;
      const currentBreakdownArr = LOCATIONS.filter(
        (loc) => (selectedBreakdown[w]?.[loc] ?? 0) > 0,
      ).map((loc) => ({ location: loc, qty: selectedBreakdown[w][loc] }));
      const stokByLoc = getStokAllLocations(warnaPanel.product, warnaPanel.variant.size, w);

      const allocated = allocateAcrossLocations({
        stokByLoc,
        primaryLocation: location,
        currentBreakdown: currentBreakdownArr,
        want: currentTotal + 1,
      });
      const newTotal = allocated.reduce((s, a) => s + a.qty, 0);
      if (newTotal <= currentTotal) return; // sudah habis di semua lokasi

      nextWarna[w] = newTotal;
      nextBreakdown[w] = LOCATIONS.reduce((acc, loc) => {
        acc[loc] = allocated.find((a) => a.location === loc)?.qty ?? 0;
        return acc;
      }, {});
    });
    setSelectedWarna(nextWarna);
    setSelectedBreakdown(nextBreakdown);
  }

  /**
   * Set qty satu warna di satu lokasi tertentu (dipakai saat mode gabungan
   * aktif — WarnaPanel menampilkan stepper per lokasi GD/CD/TG). Hanya
   * clamp ke >=0 di sini; batas maksimum (stok lokasi itu) dihitung &
   * ditegakkan oleh komponen sebelum memanggil ini.
   */
  function setWarnaLoc(warnaName, loc, qty) {
    const clamped = Math.max(0, qty);
    const bd = { ...(selectedBreakdown[warnaName] ?? {}), [loc]: clamped };
    const total = LOCATIONS.reduce((s, l) => s + (bd[l] ?? 0), 0);
    setSelectedBreakdown((prev) => ({ ...prev, [warnaName]: bd }));
    setSelectedWarna((prev) => ({ ...prev, [warnaName]: total }));
  }

  /** Konfirmasi pilihan warna → masuk ke cart */
  function confirmWarna() {
    const items = Object.entries(selectedWarna)
      .filter(([, q]) => q > 0)
      .map(([nama, qty]) => {
        const breakdown = gabungan
          ? LOCATIONS.map((loc) => ({ location: loc, qty: selectedBreakdown[nama]?.[loc] ?? 0 })).filter(
              (b) => b.qty > 0,
            )
          : [{ location, qty }];
        return { nama, qty, breakdown };
      });
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
    const prefillBreakdown = {};
    (item.warna ?? []).forEach((w) => {
      prefill[w.nama] = w.qty;
      if (Array.isArray(w.breakdown) && w.breakdown.length > 0) {
        prefillBreakdown[w.nama] = breakdownArrToMap(w.breakdown);
      }
    });
    setSelectedWarna(prefill);
    setSelectedBreakdown(prefillBreakdown);
    setWarnaPanel({ product, variant });
  }

  /**
   * Ubah qty item simple (bukan warna).
   * @param {string} key
   * @param {number} delta
   * @param {object[]} [products] - dipakai utk lookup stok segar saat mode
   *   gabungan aktif & qty bertambah (mirrors editWarnaItem(item, products)).
   *   Kalau tidak disediakan / produk tidak ketemu, fallback ke breakdown
   *   yang sudah ada (aman utk pengurangan, tidak menambah kapasitas baru).
   */
  function updateQty(key, delta, products) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.key !== key || i.warna) return i;
          const newQty = Math.max(0, (i.qty ?? 0) + delta);
          let breakdown;
          if (!gabungan) {
            breakdown = newQty > 0 ? [{ location, qty: newQty }] : [];
          } else {
            const product = products?.find((p) => p.kode === i.kode);
            const stokByLoc = product
              ? getStokAllLocations(product, i.size, "_")
              : breakdownArrToMap(i.breakdown);
            breakdown = allocateAcrossLocations({
              stokByLoc,
              primaryLocation: location,
              currentBreakdown: i.breakdown ?? [],
              want: newQty,
            });
          }
          return { ...i, qty: newQty, breakdown };
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
        const newQty = (next[idx].qty ?? 0) + 1;
        const breakdown = gabungan
          ? allocateAcrossLocations({
              stokByLoc: getStokAllLocations(product, variant.size, "_"),
              primaryLocation: location,
              currentBreakdown: next[idx].breakdown ?? [],
              want: newQty,
            })
          : [{ location, qty: newQty }];
        next[idx] = { ...next[idx], qty: newQty, breakdown };
        return next;
      }
      const breakdown = gabungan
        ? allocateAcrossLocations({
            stokByLoc: getStokAllLocations(product, variant.size, "_"),
            primaryLocation: location,
            currentBreakdown: [],
            want: 1,
          })
        : [{ location, qty: 1 }];
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
          breakdown,
        },
      ];
    });
    setShowCart(true);
  }

  return {
    // State
    cart,
    editingPrice,
    setEditingPrice,
    showCart,
    setShowCart,
    warnaPanel,
    selectedWarna,
    setSelectedWarna,
    gabungan,
    setGabungan,
    toggleGabungan,
    selectedBreakdown,
    setWarnaLoc,
    showDiskon,
    setShowDiskon,
    diskonInput,
    setDiskonInput,
    diskonMode,
    setDiskonMode,
    // Computed
    subtotal,
    diskon,
    total,
    totalItems,
    // Actions
    openWarnaPanel,
    closeWarnaPanel,
    selectFullSeri,
    confirmWarna,
    editWarnaItem,
    updateQty,
    setItemHarga,
    removeItem,
    resetCart,
    removeDiskon,
    getPayloadItems,
  };
}

// ── useCheckout ──────────────────────────────────────────────────────────────
/**
 * @param {object} opts
 * @param {ReturnType<typeof useCart>} opts.cart
 * @param {string} opts.location
 * @param {string} opts.buyerName
 * @param {string} opts.buyerHp
 * @param {string|null} opts.pelangganId
 * @param {(id: string) => void} opts.setPelangganId
 * @returns {{ bayar: () => Promise<object|null>, saving: boolean }}
 *   `bayar()` mengembalikan payload struk kalau sukses, atau `null` kalau
 *   cart kosong / transaksi gagal (toast error sudah ditampilkan di sini).
 */
export function useCheckout({ cart, location, buyerName, buyerHp, pelangganId, setPelangganId }) {
  const createSale = useCreateSale();
  const { user } = useAuth();
  const { notifyTransaction } = useTransactionNotification();
  const [saving, setSaving] = useState(false);

  async function bayar() {
    if (!cart.cart.length) return null;
    setSaving(true);

    // Ambil data sebelum cart direset
    const payloadItems = cart.getPayloadItems();
    const { total, diskon } = cart;

    // Auto-simpan pelanggan baru jika nama diisi tapi belum terpilih dari database
    let resolvedPelangganId = pelangganId;
    if (buyerName.trim() && !pelangganId) {
      try {
        const existing = await searchPelanggan(buyerName.trim());
        const exactMatch = existing.find(
          (p) => p.nama.toLowerCase() === buyerName.trim().toLowerCase(),
        );
        if (exactMatch) {
          resolvedPelangganId = exactMatch.id;
          setPelangganId(exactMatch.id);
        } else {
          const np = await addPelanggan({
            nama: buyerName.trim().toUpperCase(),
            no_hp: buyerHp.trim() || null,
          });
          resolvedPelangganId = np.id;
          setPelangganId(np.id);
        }
      } catch (err) {
        // Gagal simpan/link pelanggan TIDAK boleh membatalkan transaksi
        // (kasir tetap harus bisa checkout walau offline/RLS error) — tapi
        // kegagalan ini HARUS terlihat (bukan silent) supaya staff sadar
        // ada pembeli yang belum ke-link ke pelanggan dan bisa tambahkan
        // manual lewat halaman Pelanggan. Sebelumnya silent-catch di sini
        // adalah salah satu penyebab banyak transaksi lama punya buyer_name
        // tanpa pelanggan_id (lihat backfill_pelanggan_from_buyer_name).
        toast.error(
          `Transaksi tetap tersimpan, tapi gagal simpan "${buyerName.trim()}" sbg pelanggan: ${err.message}`,
        );
      }
    }

    let struk = null;
    try {
      await createSale({
        items: payloadItems,
        total,
        discount: diskon,
        buyerName,
        buyerHp,
        pelangganId: resolvedPelangganId,
        location,
      });

      struk = {
        date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        type: "sale",
        location,
        buyer_name: buyerName || null,
        buyer_hp: buyerHp || null,
        created_by_name: displayName(user),
        items: payloadItems,
        discount: diskon,
        total,
      };

      cart.resetCart();
      toast.success(`Transaksi Rp ${total.toLocaleString("id-ID")} berhasil dicatat!`);
      notifyTransaction({ total, itemCount: payloadItems.length, buyerName });
    } catch (err) {
      toast.error("Gagal mencatat transaksi: " + err.message);
    }
    setSaving(false);
    return struk;
  }

  return { bayar, saving };
}
