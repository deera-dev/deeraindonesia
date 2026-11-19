import { useState } from "react";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useCreateSale, useAdjustStokOnly, useReverseStokAdjustments } from "../penjualan";
import { searchPelanggan, addPelanggan } from "../pelanggan";
import { useTransactionNotification } from "../../shared/hooks/useTransactionNotification";
import {
  useCreateKeepMutation,
  useUpdateKeepMutation,
  useMarkKeepPaidMutation,
  useCancelKeepMutation,
  useMarkKeepTerkirimMutation,
} from "./queries";
import { buildKeepStruk } from "./utils";

export { useKeepOrdersQuery } from "./queries";
export { buildKeepStruk, keepPcs, fmtKeepTanggal, keepToCartItems, keepUsesOtherLocations } from "./utils";

async function resolvePelangganId({ buyerName, buyerHp, pelangganId, setPelangganId }) {
  const nama = (buyerName ?? "").trim();
  if (!nama || pelangganId) return pelangganId;
  try {
    const existing = await searchPelanggan(nama);
    const exact = existing.find((p) => p.nama.toLowerCase() === nama.toLowerCase());
    const p = exact ?? (await addPelanggan({ nama: nama.toUpperCase(), no_hp: (buyerHp ?? "").trim() || null }));
    setPelangganId?.(p.id);
    return p.id;
  } catch (err) {
    toast.error(`Keep tetap tersimpan, tapi gagal simpan "${nama}" sbg pelanggan: ${err.message}`);
    return pelangganId;
  }
}

export function useKeepCheckout({ cart, location, buyerName, buyerHp, pelangganId, setPelangganId, editingKeep = null }) {
  const { user } = useAuth();
  const createMutation = useCreateKeepMutation();
  const updateMutation = useUpdateKeepMutation();
  const markPaid = useMarkKeepPaidMutation();
  const [saving, setSaving] = useState(false);

  // Saran admin (November 2026): dropdown "Pasar" di atas dipakai dobel utk
  // "saya lagi di mana sekarang" DAN "keep ini utk lokasi mana" — gampang
  // kebawa nyangkut dari aksi sebelumnya (mis. abis edit keep lokasi lain).
  // `locationOverride` dipakai dari dialog konfirmasi lokasi keep BARU
  // (KeepLocationModal) supaya tidak diam-diam ikut `location` yang
  // kebetulan masih nyangkut; mode edit tetap pakai `location` biasa (sudah
  // disinkronkan saat keep dimuat ke cart).
  async function simpanKeep({ location: locationOverride } = {}) {
    if (!cart.cart.length) return null;
    setSaving(true);
    try {
      const items = cart.getPayloadItems();
      const resolvedId = await resolvePelangganId({ buyerName, buyerHp, pelangganId, setPelangganId });
      const effectiveLocation = locationOverride ?? location;
      const fields = { items, total: cart.total, discount: cart.diskon, buyerName, buyerHp, pelangganId: resolvedId, location: effectiveLocation };
      const row = editingKeep
        ? await updateMutation.mutateAsync({ id: editingKeep.id, ...fields })
        : await createMutation.mutateAsync({ ...fields, user: { email: user?.email, name: displayName(user) } });
      cart.resetCart();
      toast.success(editingKeep ? "Keep diperbarui (belum dibayar)." : "Pesanan di-keep (belum dibayar).");
      return buildKeepStruk(row);
    } catch (err) {
      toast.error("Gagal menyimpan keep: " + err.message + " (keep butuh koneksi internet).");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function tandaiKeepLunas(id) {
    try {
      await markPaid.mutateAsync(id);
    } catch (err) {
      toast.error(`Pembayaran tercatat, tapi gagal menandai keep lunas (${err.message}). Batalkan keep ini secara manual agar tidak dobel.`);
    }
  }

  return { simpanKeep, tandaiKeepLunas, saving };
}

// Keep harus ditandai "terkirim" dulu (lihat useKeepFulfillment) sebelum
// bisa dibayar — stok sudah dikurangi sejak terkirim, jadi di sini
// createSale dipanggil dgn skipStockAdjustment supaya tidak dikurangi
// dobel; stok_adjustments disalin persis dari yang diterapkan saat
// terkirim (penting utk retur nanti tetap ke lokasi yang benar).
export function usePayKeep() {
  const { user } = useAuth();
  const createSale = useCreateSale();
  const markPaid = useMarkKeepPaidMutation();
  const { notifyTransaction } = useTransactionNotification();
  const [payingId, setPayingId] = useState(null);

  async function payKeep(keep) {
    if (keep.status !== "terkirim") {
      toast.error('Keep harus ditandai "Kirim" dulu sebelum bisa dibayar.');
      return null;
    }
    setPayingId(keep.id);
    try {
      await createSale({
        items: keep.items,
        total: keep.total,
        discount: keep.discount ?? 0,
        buyerName: keep.buyer_name,
        buyerHp: keep.buyer_hp,
        pelangganId: keep.pelanggan_id,
        location: keep.location,
        skipStockAdjustment: true,
        stokAdjustments: keep.stok_adjustments ?? [],
      });
    } catch (err) {
      toast.error("Gagal mencatat pembayaran: " + err.message);
      setPayingId(null);
      return null;
    }
    try {
      await markPaid.mutateAsync(keep.id);
    } catch (err) {
      toast.error(`Pembayaran tercatat, tapi gagal menandai keep lunas (${err.message}). Batalkan keep ini secara manual agar tidak dobel.`);
    }
    toast.success(`Keep ${keep.buyer_name || ""} lunas — Rp ${(keep.total ?? 0).toLocaleString("id-ID")} dicatat!`.replace("  ", " "));
    notifyTransaction({ total: keep.total ?? 0, itemCount: (keep.items ?? []).length, buyerName: keep.buyer_name });
    setPayingId(null);
    return buildKeepStruk(keep, { paid: true, cashierName: displayName(user) });
  }

  return { payKeep, payingId };
}

// Keep ditandai "terkirim" begitu barangnya benar2 diambil/dikirim ke
// pembeli — walaupun belum dibayar, karena fisiknya memang sudah tidak
// ada lagi di lokasi itu sejak saat ini (bukan baru nanti pas dibayar).
// Ini mencegah stok opname "salah" menghitung barang yang sudah
// disisihkan tapi belum dibayar sebagai masih ada di rak.
export function useKeepFulfillment() {
  const adjustStokOnly = useAdjustStokOnly();
  const reverseStokAdjustments = useReverseStokAdjustments();
  const markTerkirim = useMarkKeepTerkirimMutation();
  const cancelMutation = useCancelKeepMutation();
  const [processingId, setProcessingId] = useState(null);

  async function kirimKeep(keep) {
    setProcessingId(keep.id);
    try {
      const adjs = await adjustStokOnly({ items: keep.items, location: keep.location, sign: -1 });
      await markTerkirim.mutateAsync({ id: keep.id, stokAdjustments: adjs });
      toast.success("Keep ditandai terkirim — stok sudah dikurangi.");
    } catch (err) {
      toast.error("Gagal menandai terkirim: " + err.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function batalkanKeep(keep) {
    setProcessingId(keep.id);
    try {
      if (keep.status === "terkirim" && keep.stok_adjustments?.length) {
        await reverseStokAdjustments(keep.stok_adjustments);
      }
      await cancelMutation.mutateAsync(keep.id);
      toast.success(keep.status === "terkirim" ? "Keep dibatalkan, stok dikembalikan." : "Keep dibatalkan.");
    } catch (err) {
      toast.error("Gagal membatalkan keep: " + err.message);
    } finally {
      setProcessingId(null);
    }
  }

  return { kirimKeep, batalkanKeep, processingId };
}
