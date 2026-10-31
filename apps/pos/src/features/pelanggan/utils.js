export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function groupSaleItems(items) {
  return (items ?? []).map((item) => {
    const harga = Number(item.harga) || 0;
    const hpp = Number(item.hpp) || 0;
    let qty = 0;
    let warnaBreakdown = [];
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      warnaBreakdown = item.warna.map((w) => ({ warna: w.nama ?? "-", qty: Number(w.qty) || 0 }));
      qty = warnaBreakdown.reduce((sum, w) => sum + w.qty, 0);
    } else {
      qty = Number(item.qty) || 0;
    }
    return {
      kode: item.kode,
      size: item.size ?? null,
      harga,
      hpp,
      qty,
      subtotal: harga * qty,
      warnaBreakdown,
    };
  });
}
