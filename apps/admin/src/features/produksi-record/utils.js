/**
 * utils.js — Helper murni untuk fitur catatan produksi batch.
 */
import { SIZE_PRESETS } from "@deera/shared/lib/constants";

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function genBatchNo() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PROD-${d}-${Math.floor(Math.random() * 900 + 100)}`;
}

export function buildKode(angka, bahan) {
  const a = String(angka ?? "").trim();
  const b = String(bahan ?? "")
    .trim()
    .toUpperCase();
  if (!a && !b) return "";
  return `D-${a}-${b}`;
}

export const inputCls =
  "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
export const labelCls =
  "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

// ── Helper khusus BatchForm (edit mode single-product) ──────────────────────
export function parseKode(kode) {
  const m = (kode ?? "").match(/^D-(\w+)-([A-Z]+)$/i);
  return m ? { angka: m[1], bahan: m[2].toUpperCase() } : { angka: "", bahan: "" };
}

export function initVariants(sizes) {
  const aktifSet = new Set((sizes ?? []).map((s) => s.size));
  return SIZE_PRESETS.map((p) => ({ ...p, aktif: aktifSet.has(p.size) }));
}

export function initWarnaList(sizes) {
  const warnas = new Set();
  for (const sz of sizes ?? []) {
    for (const w of sz.warna ?? []) {
      if (w.warna !== "_") warnas.add(w.warna);
    }
  }
  return [...warnas];
}

export function initQtyMap(sizes) {
  const map = {};
  for (const sz of sizes ?? []) {
    map[sz.size] = {};
    for (const w of sz.warna ?? []) {
      map[sz.size][w.warna] = w.qty;
    }
  }
  return map;
}

// ── Helper khusus BatchForm (mode tambah / multi-entry) ──────────────────────
export function newEntry() {
  return {
    _key: Math.random(),
    kodeAngka: "",
    kodeBahan: "",
    nama: "",
    bahan: "",
    variants: SIZE_PRESETS.map((s) => ({ ...s, aktif: false })),
    warnaInput: "",
    warnaList: [],
    qtyMap: {},
    template: null, // null = not fetched, false = not found, object = found
    loadingTpl: false,
    templateFetched: "", // track last fetched kode to avoid re-fetch
    expanded: true,
  };
}

export function entryTotalKain(entry) {
  return Object.values(entry.qtyMap).reduce(
    (s, wMap) => s + Object.values(wMap).reduce((ss, q) => ss + (Number(q) || 0), 0),
    0,
  );
}
