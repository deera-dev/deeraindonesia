/**
 * features/keep/hooks.js — public surface fitur Keep (barang disisihkan,
 * belum dibayar). Keep BUKAN penjualan: tidak mengurangi stok & tidak masuk
 * omzet sampai dibayar (lihat migrasi keep_orders).
 *
 * useKeepCheckout — simpan isi keranjang sbg keep (cart direset, struk
 *   dgn flag belum_lunas khusus aplikasi dikembalikan).
 * usePayKeep — bayar 1 keep: buat transaksi `sales` biasa lewat useCreateSale
 *   (stok berkurang, masuk laporan, push notif), tandai keep 'lunas', balikkan
 *   struk LUNAS.
 */
import { useState } from "react";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useCreateSale } from "../penjualan";
import { searchPelanggan, addPelanggan } from "../pelanggan";
import { useTransactionNotification } from "../../shared/hooks/useTransactionNotification";
import { useCreateKeepMutation, useMarkKeepPaidMutation } from "./queries";
import { buildKeepStruk } from "./utils";

export { useKeepOrdersQuery, useCancelKeepMutation } from "./queries";
export { buildKeepStruk, keepPcs, fmtKeepTanggal } from "./utils";

// Sama dgn auto-simpan pelanggan di useCheckout (kasir) — gagal TIDAK boleh
// menggagalkan keep, tapi harus kelihatan (toast).
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

export function useKeepCheckout({ cart, location, buyerName, buyerHp, pelangganId, setPelangganId }) {
  const { user } = useAuth();
  const createMutation = useCreateKeepMutation();
  const [saving, setSaving] = useState(false);

  async function simpanKeep() {
    if (!cart.cart.length) return null;
    setSaving(true);
    try {
      const items = cart.getPayloadItems();
      const resolvedId = await resolvePelangganId({ buyerName, buyerHp, pelangganId, setPelangganId });
      const row = await createMutation.mutateAsync({
        items,
        total: cart.total,
        discount: cart.diskon,
        buyerName,
        buyerHp,
        pelangganId: resolvedId,
        location,
        user: { email: user?.email, name: displayName(user) },
      });
      cart.resetCart();
      toast.success("Pesanan di-keep (belum dibayar).");
      return buildKeepStruk(row);
    } catch (err) {
      toast.error("Gagal menyimpan keep: " + err.message + " (keep butuh koneksi internet).");
      return null;
    } finally {
      setSaving(false);
    }
  }

  return { simpanKeep, saving };
}

export function usePayKeep() {
  const { user } = useAuth();
  const createSale = useCreateSale();
  const markPaid = useMarkKeepPaidMutation();
  const { notifyTransaction } = useTransactionNotification();
  const [payingId, setPayingId] = useState(null);

  async function payKeep(keep) {
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
      });
    } catch (err) {
      toast.error("Gagal mencatat pembayaran: " + err.message);
      setPayingId(null);
      return null;
    }
    // Transaksi sudah tercatat. Kalau menandai keep gagal, JANGAN dicatat ulang —
    // beri tahu supaya keep dibatalkan manual (hindari stok/omzet dobel).
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
