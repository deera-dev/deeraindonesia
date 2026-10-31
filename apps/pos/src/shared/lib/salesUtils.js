import { LOCATION_LABELS, LOCATIONS } from "@deera/shared/lib/marketDay";

export function effectiveQty(item) {
  if (Array.isArray(item.warna) && item.warna.length > 0) {
    return item.warna.reduce((s, w) => s + (w.qty ?? 0), 0);
  }
  return item.qty ?? 0;
}

export function itemProfit(item) {
  const qty = effectiveQty(item);
  return ((item.harga ?? 0) - (item.hpp ?? 0)) * qty;
}

export function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatStrukDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = BULAN_ID[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm} WIB`;
}

export function getStokWarna(product, size, warnaName, loc) {
  return product.stokByWarna?.[size]?.[warnaName]?.[loc] ?? 0;
}

export function getPendingStok(product, size, loc) {
  if (!product.warna?.length) return 0;
  return product.stokByWarna?.[size]?.["_"]?.[loc] ?? 0;
}

export function getEffectiveStokWarna(product, size, warnaName, loc, selected = {}) {
  const own = getStokWarna(product, size, warnaName, loc);
  const pending = getPendingStok(product, size, loc);
  if (pending <= 0) return own;
  let used = 0;
  for (const other of product.warna ?? []) {
    if (other === warnaName) continue;
    used += Math.max(0, (selected[other] ?? 0) - getStokWarna(product, size, other, loc));
  }
  return own + Math.max(0, pending - used);
}

export function getTotalStokVariant(product, size, loc) {
  return Object.values(product.stokByWarna?.[size] ?? {}).reduce((s, v) => s + (v[loc] ?? 0), 0);
}
export function getStokAllLocations(product, size, warnaName) {
  return product.stokByWarna?.[size]?.[warnaName] ?? { gudang: 0, cideng: 0, tegalgubug: 0 };
}

export function getCombinedStok(product, size, warnaName) {
  const s = getStokAllLocations(product, size, warnaName);
  return LOCATIONS.reduce((sum, loc) => sum + (s[loc] ?? 0), 0);
}

export function getCombinedStokVariant(product, size) {
  return Object.keys(product.stokByWarna?.[size] ?? {}).reduce(
    (sum, w) => sum + getCombinedStok(product, size, w),
    0,
  );
}

export function allocateAcrossLocations({
  stokByLoc,
  primaryLocation,
  currentBreakdown = [],
  want,
}) {
  const order = [primaryLocation, ...LOCATIONS.filter((l) => l !== primaryLocation)];
  const used = {};
  for (const b of currentBreakdown) used[b.location] = (used[b.location] ?? 0) + b.qty;
  const result = order.map((loc) => ({
    location: loc,
    qty: Math.min(used[loc] ?? 0, stokByLoc[loc] ?? 0),
  }));
  let remaining = want - result.reduce((s, r) => s + r.qty, 0);
  if (remaining > 0) {
    for (const r of result) {
      if (remaining <= 0) break;
      const cap = stokByLoc[r.location] ?? 0;
      const room = cap - r.qty;
      if (room <= 0) continue;
      const add = Math.min(room, remaining);
      r.qty += add;
      remaining -= add;
    }
  } else if (remaining < 0) {
    let toRemove = -remaining;
    const removeOrder = [...LOCATIONS.filter((l) => l !== primaryLocation), primaryLocation];
    for (const loc of removeOrder) {
      if (toRemove <= 0) break;
      const r = result.find((x) => x.location === loc);
      if (!r || r.qty <= 0) continue;
      const cut = Math.min(r.qty, toRemove);
      r.qty -= cut;
      toRemove -= cut;
    }
  }
  return result.filter((r) => r.qty > 0);
}

export function getSaleLocationBreakdown(sale) {
  const adjs = (sale?.stok_adjustments ?? []).filter((a) => a.delta < 0);
  const byLoc = {};
  for (const a of adjs) byLoc[a.location] = (byLoc[a.location] ?? 0) + Math.abs(a.delta);
  return byLoc;
}

export function formatSaleLocationBreakdown(sale) {
  const byLoc = getSaleLocationBreakdown(sale);
  const entries = LOCATIONS.filter((loc) => (byLoc[loc] ?? 0) > 0);
  if (entries.length <= 1) return null;
  return entries.map((loc) => `${LOCATION_LABELS[loc] ?? loc} ${byLoc[loc]}`).join(" · ");
}
