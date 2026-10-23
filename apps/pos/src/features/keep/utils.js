export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtKeepTanggal(ymd) {
  const [y, m, d] = (ymd ?? "").split("-").map(Number);
  if (!y) return "";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function keepPcs(items) {
  return (items ?? []).reduce((sum, item) => {
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      return sum + item.warna.reduce((s, w) => s + (Number(w.qty) || 0), 0);
    }
    return sum + (Number(item.qty) || 0);
  }, 0);
}

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

export function keepToCartItems(items, products = []) {
  return (items ?? []).map((item) => {
    const product = products.find((p) => p.kode === item.kode);
    return { ...item, key: `${item.kode}-${item.size}`, image: product?.image ?? null };
  });
}

export function keepUsesOtherLocations(keep) {
  return (keep?.items ?? []).some((item) => {
    const breakdowns = Array.isArray(item.warna) ? item.warna.flatMap((w) => w.breakdown ?? []) : (item.breakdown ?? []);
    return breakdowns.some((b) => b.location && b.location !== keep.location);
  });
}
