/**
 * useTransactionNotification.js
 *
 * Menampilkan browser notification setiap kali transaksi berhasil dicatat.
 * Pola: sama dengan usePasarNotification — pakai native Notification API, tanpa service worker.
 *
 * Penggunaan:
 *   const { notifyTransaction } = useTransactionNotification();
 *   // Setelah transaksi berhasil:
 *   notifyTransaction({ total, itemCount, buyerName });
 */
import { useEffect } from "react";

let permissionRequested = false;

export function useTransactionNotification() {
  // Minta izin sekali saat mount (jika belum pernah diminta)
  useEffect(() => {
    if (permissionRequested) return;
    if (!("Notification" in window)) return;
    permissionRequested = true;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  /**
   * Tampilkan notifikasi transaksi berhasil.
   * @param {object} params
   * @param {number} params.total       - Total pembayaran (integer Rupiah)
   * @param {number} params.itemCount   - Jumlah item dalam transaksi
   * @param {string} [params.buyerName] - Nama pembeli (opsional)
   */
  function notifyTransaction({ total, itemCount, buyerName }) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const body = [
      `${itemCount} item · Rp ${total.toLocaleString("id-ID")}`,
      buyerName ? `Pembeli: ${buyerName}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      new Notification("✅ Transaksi Berhasil", {
        body,
        icon: "/logo-deera.png",
        tag: `deera-txn-${Date.now()}`,
        silent: false,
      });
    } catch {
      // Browser tertentu bisa throw (e.g. permission race, PWA restrictions).
      // Tidak perlu ditampilkan ke user — transaksi sudah tersimpan.
    }
  }

  return { notifyTransaction };
}
