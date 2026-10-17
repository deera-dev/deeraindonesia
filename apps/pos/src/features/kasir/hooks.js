import { useState, useMemo } from "react";
import { useKasirDraftStore } from "./store";
import { LOCATIONS } from "@deera/shared/lib/marketDay";
import {
  getStokWarna,
  getEffectiveStokWarna,
  getStokAllLocations,
  getCombinedStok,
  allocateAcrossLocations,
} from "../../shared/lib/salesUtils";
import { useCreateSale, useCreateRetur } from "../penjualan";
import { searchPelanggan, addPelanggan } from "../pelanggan";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { useTransactionNotification } from "../../shared/hooks/useTransactionNotification";
import { toast } from "@deera/shared/features/toast/hooks";

function breakdownArrToMap(breakdown) {
  if (!Array.isArray(breakdown)) return {};
  return breakdown.reduce((acc, b) => {
    acc[b.location] = b.qty;
    return acc;
  }, {});
}

export function useCart(location) {
  const cart = useKasirDraftStore((s) => s.cart);
  const setCart = useKasirDraftStore((s) => s.setCart);

  const [editingPrice, setEditingPrice] = useState(null);

  const [showCart, setShowCart] = useState(false);

  const [warnaPanel, setWarnaPanel] = useState(null);
  const [selectedWarna, setSelectedWarna] = useState({});

  const [gabungan, setGabungan] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState({});

  const showDiskon = useKasirDraftStore((s) => s.showDiskon);
  const setShowDiskon = useKasirDraftStore((s) => s.setShowDiskon);
  const diskonInput = useKasirDraftStore((s) => s.diskonInput);
  const setDiskonInput = useKasirDraftStore((s) => s.setDiskonInput);
  const diskonMode = useKasirDraftStore((s) => s.diskonMode);
  const setDiskonMode = useKasirDraftStore((s) => s.setDiskonMode);

  const subtotal = cart.reduce((s, i) => s + i.harga * _qty(i), 0);
  const totalItems = cart.reduce((s, i) => s + _qty(i), 0);

  const diskon = useMemo(() => {
    const raw = parseInt(diskonInput.replace(/\D/g, "")) || 0;
    if (!showDiskon || raw === 0) return 0;
    if (diskonMode === "persen") return Math.round((subtotal * raw) / 100);
    return Math.min(raw, subtotal);
  }, [showDiskon, diskonInput, diskonMode, subtotal]);

  const total = subtotal - diskon;

  function _qty(item) {
    return Array.isArray(item.warna) ? item.warna.reduce((s, w) => s + (w.qty ?? 0), 0) : (item.qty ?? 0);
  }

  function toggleGabungan() {
    setGabungan((v) => !v);
  }


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

  function closeWarnaPanel() {
    setWarnaPanel(null);
    setSelectedWarna({});
    setSelectedBreakdown({});
  }

  function selectFullSeri() {
    if (!warnaPanel) return;

    if (!gabungan) {
      const next = { ...selectedWarna };
      warnaPanel.product.warna.forEach((w) => {
        const stok = getEffectiveStokWarna(warnaPanel.product, warnaPanel.variant.size, w, location, next);
        if (stok <= 0) return;
        const newQty = (selectedWarna[w] ?? 0) + 1;
        next[w] = Math.min(stok, newQty);
      });
      setSelectedWarna(next);
      return;
    }

    const nextWarna = { ...selectedWarna };
    const nextBreakdown = { ...selectedBreakdown };
    warnaPanel.product.warna.forEach((w) => {
      const combinedStok = getCombinedStok(warnaPanel.product, warnaPanel.variant.size, w);
      if (combinedStok <= 0) return;

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
      if (newTotal <= currentTotal) return;

      nextWarna[w] = newTotal;
      nextBreakdown[w] = LOCATIONS.reduce((acc, loc) => {
        acc[loc] = allocated.find((a) => a.location === loc)?.qty ?? 0;
        return acc;
      }, {});
    });
    setSelectedWarna(nextWarna);
    setSelectedBreakdown(nextBreakdown);
  }

  function setWarnaLoc(warnaName, loc, qty) {
    const clamped = Math.max(0, qty);
    const bd = { ...(selectedBreakdown[warnaName] ?? {}), [loc]: clamped };
    const total = LOCATIONS.reduce((s, l) => s + (bd[l] ?? 0), 0);
    setSelectedBreakdown((prev) => ({ ...prev, [warnaName]: bd }));
    setSelectedWarna((prev) => ({ ...prev, [warnaName]: total }));
  }

  function confirmWarna(opts) {
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
    if (!opts?.lanjut) setShowCart(true);
  }

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

  function setItemHarga(key, newHarga) {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, harga: newHarga } : i)));
    setEditingPrice(null);
  }

  function removeItem(key) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  function resetCart() {
    useKasirDraftStore.getState().resetDraft();
    setShowCart(false);
  }

  function removeDiskon() {
    setShowDiskon(false);
    setDiskonInput("");
  }

  function getPayloadItems() {
    return cart.map(({ key: _k, image: _img, ...rest }) => rest);
  }

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
    subtotal,
    diskon,
    total,
    totalItems,
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

export function useCheckout({
  cart,
  location,
  buyerName,
  buyerHp,
  pelangganId,
  setPelangganId,
  exchange = null,
  onExchangeApplied,
}) {
  const createSale = useCreateSale();
  const createRetur = useCreateRetur();
  const { user } = useAuth();
  const { notifyTransaction } = useTransactionNotification();
  const [saving, setSaving] = useState(false);

  async function bayar() {
    if (!cart.cart.length) return null;
    setSaving(true);

    const payloadItems = cart.getPayloadItems();
    const { total, diskon, subtotal } = cart;

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
        toast.error(
          `Transaksi tetap tersimpan, tapi gagal simpan "${buyerName.trim()}" sbg pelanggan: ${err.message}`,
        );
      }
    }

    let struk = null;
    let returDone = false;
    try {
      if (exchange) {
        await createRetur({
          originalSale: exchange.originalSale,
          items: exchange.items,
          total: exchange.total,
        });
        returDone = true;
      }

      await createSale({
        items: payloadItems,
        total,
        discount: diskon,
        buyerName,
        buyerHp,
        pelangganId: resolvedPelangganId,
        location,
      });

      const now = new Date();
      if (exchange) {
        struk = {
          date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "tukar_tambah",
          location,
          buyer_name: buyerName || null,
          buyer_hp: buyerHp || null,
          created_by_name: displayName(user),
          items: [
            ...payloadItems.map((i) => ({ ...i, isRetur: false })),
            ...exchange.items.map((i) => ({ ...i, isRetur: true })),
          ],
          discount: diskon,
          saleSubtotal: subtotal,
          returTotal: exchange.total,
          total: total - exchange.total,
        };
      } else {
        struk = {
          date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "sale",
          location,
          buyer_name: buyerName || null,
          buyer_hp: buyerHp || null,
          created_by_name: displayName(user),
          items: payloadItems,
          discount: diskon,
          total,
        };
      }

      cart.resetCart();
      onExchangeApplied?.();
      const netMsg = exchange ? total - exchange.total : total;
      toast.success(
        netMsg < 0
          ? `Tukar Tambah dicatat — kembalikan Rp ${Math.abs(netMsg).toLocaleString("id-ID")} ke pembeli.`
          : `Transaksi Rp ${netMsg.toLocaleString("id-ID")} berhasil dicatat!`,
      );
      notifyTransaction({ total: netMsg, itemCount: payloadItems.length, buyerName });
    } catch (err) {
      if (returDone) {
        toast.error(
          `Retur berhasil dicatat (stok sudah kembali), tapi transaksi pembelian baru gagal: ${err.message}. Buat transaksi baru untuk barang penggantinya.`,
        );
        onExchangeApplied?.();
      } else {
        toast.error("Gagal mencatat transaksi: " + err.message);
      }
    }
    setSaving(false);
    return struk;
  }

  return { bayar, saving };
}
