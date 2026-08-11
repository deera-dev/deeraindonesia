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
    // Upah tukang jahit per pcs utk batch ini (Rp) — SENGAJA terpisah dari
    // upah_jahit di Template HPP (itu komponen kalkulasi HPP, beda konsep).
    // Dibaca apps/finance utk auto-isi "Upah / pcs" di form Tim Jahit.
    upahJahit: "",
  };
}

export function entryTotalKain(entry) {
  return Object.values(entry.qtyMap).reduce(
    (s, wMap) => s + Object.values(wMap).reduce((a, v) => a + (Number(v) || 0), 0),
    0,
  );
}

// ── Search & Filter (ProduksiRecordPage) ─────────────────────────────────────
/**
 * filterAndSortBatches(batches, filter, { search })
 *
 * Kalkulasi murni utk list Catatan Produksi — search box + modal filter
 * (rentang tanggal, rentang jumlah potong, rentang HPP/pcs, rentang upah
 * jahit/pcs, status sinkronisasi bahan, sort). Dipakai baik utk hasil FINAL
 * (filter.applied) maupun PREVIEW jumlah batch di footer modal
 * (filter.draft, sebelum tombol Terapkan ditekan) — dua pemanggilan, satu
 * fungsi, supaya logic tidak pernah dobel (pola sama seperti
 * filterAndSortProducts di features/produk/utils.js).
 *
 * - Search mencocokkan kode_produk, nama_produk, batch_no, catatan, dan
 *   nama_bahan di dalam bahan_dipakai[].
 * - "belumTersinkron" (status bahan "belum") = !bahan_dipakai ||
 *   bahan_dipakai.length === 0 — definisi SAMA dengan BatchCard.jsx supaya
 *   badge amber & filter selalu konsisten.
 * - Default sort "terbaru" = tanggal_produksi terbaru dulu (urutan yang
 *   sama dengan query default useBatches(), supaya tanpa filter aktif
 *   tampilan tidak berubah dari sebelumnya).
 */
export function filterAndSortBatches(batches, filter, { search = "" } = {}) {
  const q = search.trim().toLowerCase();
  const tanggalMin = filter.tanggalMin || null;
  const tanggalMax = filter.tanggalMax || null;
  const potongMin = filter.potongMin === "" ? null : Number(filter.potongMin);
  const potongMax = filter.potongMax === "" ? null : Number(filter.potongMax);
  const hppMin = filter.hppMin === "" ? null : Number(filter.hppMin);
  const hppMax = filter.hppMax === "" ? null : Number(filter.hppMax);
  const upahMin = filter.upahJahitMin === "" ? null : Number(filter.upahJahitMin);
  const upahMax = filter.upahJahitMax === "" ? null : Number(filter.upahJahitMax);

  const filtered = (batches ?? []).filter((b) => {
    if (q) {
      const bahanNames = (b.bahan_dipakai ?? []).map((x) => (x.nama_bahan ?? "").toLowerCase());
      const matchSearch =
        (b.kode_produk ?? "").toLowerCase().includes(q) ||
        (b.nama_produk ?? "").toLowerCase().includes(q) ||
        (b.batch_no ?? "").toLowerCase().includes(q) ||
        (b.catatan ?? "").toLowerCase().includes(q) ||
        bahanNames.some((n) => n.includes(q));
      if (!matchSearch) return false;
    }

    const tgl = b.tanggal_produksi ?? "";
    if (tanggalMin !== null && tgl < tanggalMin) return false;
    if (tanggalMax !== null && tgl > tanggalMax) return false;

    const potong = Number(b.total_kain) || 0;
    if (potongMin !== null && potong < potongMin) return false;
    if (potongMax !== null && potong > potongMax) return false;

    const hpp = Number(b.hpp_per_item) || 0;
    if (hppMin !== null && hpp < hppMin) return false;
    if (hppMax !== null && hpp > hppMax) return false;

    const upah = Number(b.upah_jahit) || 0;
    if (upahMin !== null && upah < upahMin) return false;
    if (upahMax !== null && upah > upahMax) return false;

    const belumTersinkron = !b.bahan_dipakai || b.bahan_dipakai.length === 0;
    if (filter.bahanStatus === "belum" && !belumTersinkron) return false;
    if (filter.bahanStatus === "sinkron" && belumTersinkron) return false;

    return true;
  });

  const byTanggal = (a, b) => (a.tanggal_produksi ?? "").localeCompare(b.tanggal_produksi ?? "");
  const byPotong = (a, b) => (Number(a.total_kain) || 0) - (Number(b.total_kain) || 0);
  const byHpp = (a, b) => (Number(a.hpp_per_item) || 0) - (Number(b.hpp_per_item) || 0);

  switch (filter.sort) {
    case "terlama":
      return [...filtered].sort(byTanggal);
    case "potong-terbanyak":
      return [...filtered].sort((a, b) => -byPotong(a, b));
    case "potong-tersedikit":
      return [...filtered].sort(byPotong);
    case "hpp-tertinggi":
      return [...filtered].sort((a, b) => -byHpp(a, b));
    case "hpp-terendah":
      return [...filtered].sort(byHpp);
    case "terbaru":
    default:
      return [...filtered].sort((a, b) => -byTanggal(a, b));
  }
}
