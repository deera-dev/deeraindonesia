
export function useTransactionNotification() {
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
      icon: "/android-chrome-512x512.png",
      tag: `deera-txn-${Date.now()}`,
      silent: false,
    };

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, options))
        .catch(() => {
          try {
            new Notification(title, options);
          } catch {
          }
        });
    } else {
      try {
        new Notification(title, options);
      } catch {
      }
    }
  }

  return { notifyTransaction };
}
