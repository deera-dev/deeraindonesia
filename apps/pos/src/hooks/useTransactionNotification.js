/**
 * useTransactionNotification.js
 *
 * Menampilkan notifikasi setiap kali transaksi berhasil dicatat.
 *
 * Catatan teknis:
 * - new Notification() TIDAK bekerja di PWA standalone mode (Android Chrome).
 * - Harus pakai ServiceWorkerRegistration.showNotification() agar muncul di PWA.
 * - Fallback ke new Notification() kalau service worker belum siap (browser biasa).
 */

export function useTransactionNotification() {
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

    const title = "✅ Transaksi Berhasil";
    const options = {
      body: [
        `${itemCount} item · Rp ${total.toLocaleString("id-ID")}`,
        buyerName ? `Pembeli: ${buyerName}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      icon: "/logo-deera.png",
      tag: `deera-txn-${Date.now()}`,
      silent: false,
    };

    // Prioritas: service worker (wajib di PWA Android), fallback ke new Notification()
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, options))
        .catch(() => {
          try { new Notification(title, options); } catch { /* silent */ }
        });
    } else {
      try { new Notification(title, options); } catch { /* silent */ }
    }
  }

  return { notifyTransaction };
}
