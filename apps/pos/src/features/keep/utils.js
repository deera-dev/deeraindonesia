/**
 * features/keep/utils.js — pure helpers fitur Keep (belum dibayar).
 */
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-10-05" -> "5 Okt" (untuk daftar keep). */
export function fmtKeepTanggal(ymd) {
  const [y, m, d] = (ymd ?? "").split("-").map(Number);
  if (!y) return "";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Total pcs dari items keranjang (item warna = jumlah qty tiap warna, item simple = qty). */
export function keepPcs(items) {
  return (items ?? []).reduce((sum, item) => {
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      return sum + item.warna.reduce((s, w) => s + (Number(w.qty) || 0), 0);
    }
    return sum + (Number(item.qty) || 0);
  }, 0);
}

/**
 * Payload struk dari 1 keep. `paid: false` -> pakai tanggal/jam keep dibuat
 * + flag `belum_lunas` (HANYA flag utk aplikasi; struk TIDAK menampilkan cap
 * apa pun, permintaan Denny 2026-10); `paid: true` -> tanggal/jam bayar.
 */
export function buildKeepStruk(keep, { paid = false, now = new Date(), cashierName } = {}) {
  return {
    date: paid ? localDateStr(now) : keep.date,
    created_at: paid ? now.toISOString() : keep.created_at,
    type: "sale",
    location: keep.location,
    buyer_name: keep.buyer_name || null,
    buyer_hp: keep.buyer_hp || null,
    created_by_name: cashierName ?? keep.created_by_name ?? null,
    items: keep.items ?? [],
    discount: keep.discount ?? 0,
    total: keep.total ?? 0,
    ...(paid ? {} : { belum_lunas: true }),
  };
}
