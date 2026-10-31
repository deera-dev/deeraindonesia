import { SIZE_PRESETS } from "@deera/shared/lib/constants";

export const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "TegalGubug" },
];

export const ALL_LOC = { key: "semua", label: "Semua" };
export const LOC_TABS = [...LOCS, ALL_LOC];
export const locLabelOf = (key) => LOC_TABS.find((l) => l.key === key)?.label ?? key;

export const SIZE_ORDER = SIZE_PRESETS.reduce((acc, p, i) => ({ ...acc, [p.size]: i }), {});

export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const sd = (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99);
    if (sd !== 0) return sd;
    return (a.warna ?? "").localeCompare(b.warna ?? "");
  });
}

export function kodeNum(kode) {
  const m = (kode ?? "").match(/^D-(\d+)-/);
  return m ? parseInt(m[1], 10) : 0;
}

export function sortProductsTerbaru(products) {
  const byNama = (a, b) =>
    (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" });
  const byTanggal = (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "");
  return [...products].sort((a, b) => {
    const d = -byTanggal(a, b);
    return d !== 0 ? d : byNama(a, b);
  });
}

export function dikerjakanKey(kode, size) {
  return `${kode}|${size}`;
}

export const SIZE_COLORS = {
  Midi: "text-cyan-500 dark:text-cyan-400",
  "Midi Jumbo": "text-indigo-500 dark:text-indigo-400",
  Gamis: "text-emerald-500 dark:text-emerald-400",
  "Gamis Jumbo": "text-orange-500 dark:text-orange-400",
  "Super Jumbo": "text-fuchsia-500 dark:text-fuchsia-400",
};

const SYNTHETIC_STOK_PREFIX = "new__";

export function syntheticStokId(kode, size, warna) {
  return `${SYNTHETIC_STOK_PREFIX}${kode}__${size}__${warna}`;
}

export function isSyntheticStokId(id) {
  return typeof id === "string" && id.startsWith(SYNTHETIC_STOK_PREFIX);
}

export function parseSyntheticStokId(id) {
  if (!isSyntheticStokId(id)) return null;
  const [, kode, size, warna] = id.split("__");
  return { kode, size, warna };
}

export function fillMissingStokRows(product, existingRows) {
  const sizes = (product?.variants ?? []).map((v) => v.size).filter(Boolean);
  if (sizes.length === 0) return existingRows;
  const warnaList = product.warna?.length ? product.warna : ["_"];
  const have = new Set(existingRows.map((r) => `${r.size}__${r.warna}`));
  const placeholders = [];
  for (const size of sizes) {
    for (const warna of warnaList) {
      const key = `${size}__${warna}`;
      if (have.has(key)) continue;
      placeholders.push({
        id: syntheticStokId(product.kode, size, warna),
        kode: product.kode,
        size,
        warna,
        gudang: 0,
        cideng: 0,
        tegalgubug: 0,
      });
    }
  }
  return placeholders.length ? [...existingRows, ...placeholders] : existingRows;
}

export const NO_WARNA = "_";

export function pendingPlaceholderRow(kode, size) {
  return {
    id: syntheticStokId(kode, size, NO_WARNA),
    kode,
    size,
    warna: NO_WARNA,
    gudang: 0,
    cideng: 0,
    tegalgubug: 0,
  };
}

export function parseCount(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  return Math.max(0, parseInt(raw, 10) || 0);
}

export function computeSizeCount({ kode, size, sizeRows, loc, entries = {}, totalRaw = "" }) {
  const colored = sizeRows.filter((r) => r.warna !== NO_WARNA);
  const hasColors = colored.length > 0;
  const inputRows = hasColors ? colored : sizeRows;
  const items = inputRows.map((row) => {
    const old = row[loc] ?? 0;
    const entered = parseCount(entries[row.id]);
    return { row, old, next: entered ?? old, entered: entered !== null };
  });
  const colorSum = items.reduce((s, it) => s + it.next, 0);
  const delta = items.reduce((s, it) => s + (it.next - it.old), 0);
  let pending = null;
  let over = false;
  if (hasColors) {
    const row = sizeRows.find((r) => r.warna === NO_WARNA) ?? pendingPlaceholderRow(kode, size);
    const old = row[loc] ?? 0;
    const T = parseCount(totalRaw);
    const next = T !== null ? Math.max(0, T - colorSum) : Math.max(0, old - delta);
    over = T !== null && colorSum > T;
    pending = { row, old, next };
  }
  const changes = [
    ...items.map((it) => ({ row: it.row, old: it.old, next: it.next })),
    ...(pending ? [pending] : []),
  ].filter((c) => c.next !== c.old);
  const total = colorSum + (pending ? pending.next : 0);
  const systemTotal = items.reduce((s, it) => s + it.old, 0) + (pending ? pending.old : 0);
  return { items, hasColors, pending, colorSum, total, systemTotal, over, changes };
}

export function buildChanged(changes, loc) {
  const out = {};
  for (const c of changes) out[c.row.id] = { [loc]: c.next };
  return out;
}

export function productLocTotal(rows, loc) {
  if (loc === ALL_LOC.key)
    return rows.reduce((s, r) => s + (r.gudang ?? 0) + (r.cideng ?? 0) + (r.tegalgubug ?? 0), 0);
  return rows.reduce((s, r) => s + (r[loc] ?? 0), 0);
}

export function productStatus(counted) {
  return counted ? "sudah" : "belum";
}

export function stokAllTotal(rows) {
  return rows.reduce((s, r) => s + (r.gudang ?? 0) + (r.cideng ?? 0) + (r.tegalgubug ?? 0), 0);
}

export function pendingWarnaPcs(rows, loc) {
  if (!rows.some((r) => r.warna !== NO_WARNA)) return 0;
  return rows.filter((r) => r.warna === NO_WARNA).reduce((s, r) => s + (r[loc] ?? 0), 0);
}

export function bukuKey(kode, size, warna) {
  return `${kode}__${size}__${warna}`;
}

export function bukuRow(buku, kode, size, warna) {
  return buku?.rows?.[bukuKey(kode, size, warna)];
}

export function bukuSummary(buku, kode, size) {
  return (size ? buku?.sizes?.[`${kode}__${size}`] : buku?.kodes?.[kode]) ?? null;
}

export function bukuCompare(buku, kode, rows, extraDelta = 0) {
  const b = bukuSummary(buku, kode);
  if (!b) return null;
  const stok = stokAllTotal(rows) + extraDelta;
  return { seharusnya: b.seharusnya, stok, selisih: stok - b.seharusnya };
}

export function buildOverflowChanges(changed, rows, loc) {
  const out = [];
  for (const [id, vals] of Object.entries(changed ?? {})) {
    if (vals?.[loc] === undefined) continue;
    const row = rows.find((r) => String(r.id) === String(id));
    if (row) out.push({ size: row.size, warna: row.warna, next: vals[loc] });
  }
  return out;
}

export function applyOverflowPlan(changed, plan, rows, kode) {
  const next = { ...changed };
  for (const sz of plan?.sizes ?? []) {
    for (const a of sz.adjustments ?? []) {
      const row = rows.find(
        (r) =>
          r.kode === kode &&
          r.warna === a.warna &&
          String(r.size).toLowerCase() === String(sz.size).toLowerCase(),
      );
      if (row) next[row.id] = { ...(next[row.id] ?? {}), gudang: a.gudang_to };
    }
  }
  return next;
}

export function buildAllLocChanged(entries, rows) {
  const out = {};
  for (const [key, raw] of Object.entries(entries ?? {})) {
    const n = parseCount(raw);
    if (n === null) continue;
    const idx = key.lastIndexOf(":");
    const id = key.slice(0, idx);
    const loc = key.slice(idx + 1);
    const row = rows.find((r) => String(r.id) === id);
    if (!row || (row[loc] ?? 0) === n) continue;
    out[id] = { ...(out[id] ?? {}), [loc]: n };
  }
  return out;
}

export function changedToFullRows(changed, rows) {
  return Object.entries(changed ?? {}).flatMap(([id, vals]) => {
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) return [];
    return [
      {
        size: row.size,
        warna: row.warna,
        gudang: vals.gudang ?? row.gudang ?? 0,
        cideng: vals.cideng ?? row.cideng ?? 0,
        tegalgubug: vals.tegalgubug ?? row.tegalgubug ?? 0,
      },
    ];
  });
}

export function blockingOver(over, changed, rows) {
  const delta = {};
  for (const [id, vals] of Object.entries(changed ?? {})) {
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) continue;
    const k = String(row.size).toLowerCase();
    for (const loc of ["gudang", "cideng", "tegalgubug"]) {
      if (vals[loc] !== undefined) delta[k] = (delta[k] ?? 0) + (vals[loc] - (row[loc] ?? 0));
    }
  }
  return (over ?? []).filter((o) => (delta[String(o.size).toLowerCase()] ?? 0) > 0);
}
