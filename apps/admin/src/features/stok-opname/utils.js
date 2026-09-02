/**
 * features/stok-opname/utils.js — pure helpers untuk halaman Stok Opname.
 */
import { SIZE_PRESETS } from "@deera/shared/lib/constants";

export const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "TegalGubug" },
];

// Urutan size sesuai SIZE_PRESETS
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

// Urutan sama seperti daftar produk di halaman Produk (permintaan Denny
// 2026-08): produk terbaru dibuat duluan (created_at desc), lalu nama A-Z
// sebagai tiebreak kalau created_at sama. Sebelumnya di sini masih pakai
// urutan lama (kodeNum desc) dan tidak ikut kebijakan default itu.
export function sortProductsTerbaru(products) {
  const byNama = (a, b) => (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" });
  const byTanggal = (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "");
  return [...products].sort((a, b) => {
    const d = -byTanggal(a, b);
    return d !== 0 ? d : byNama(a, b);
  });
}

// Key konsisten kode+ukuran (TANPA warna — permintaan Denny), dipakai untuk
// mencocokkan produk di Stok Opname dengan agregat "sudah dikerjakan" dari
// v_jahit_dikerjakan (lihat features/stok-opname/api.js
// fetchJahitDikerjakan()). Semua warna digabung jadi satu total per
// kode+ukuran karena staf Tim Jahit sering tidak mengisi warna spesifik
// saat input kartu jahit (kartu_items.warna kosong) — memisah per-warna
// bikin data itu tidak pernah cocok ke baris manapun.
export function dikerjakanKey(kode, size) {
  return `${kode}|${size}`;
}

export const SIZE_COLORS = {
  Midi: "text-cyan-500 dark:text-cyan-400",
  "Midi Jumbo": "text-indigo-500 dark:text-indigo-400",
  Gamis: "text-emerald-500 dark:text-emerald-400",
  "Gamis Jumbo": "text-orange-500 dark:text-orange-400",
};

// ── Sinkronisasi tampilan Stok Opname vs data warna/ukuran produk terkini ──
// (fix bug 2026-09, laporan Denny: "tidak bisa menambahkan stok di produk
// tertentu, tulisannya belum ada data stok untuk produk ini, padahal data
// warnanya sudah ada juga"). Akar masalah: StokOpnamePage mengambil
// `products` dan `stok_warna` lewat 2 query TERPISAH lalu digabung di JS
// (lihat StokOpnamePage.jsx) — kalau sebuah kombinasi ukuran×warna produk
// BELUM PERNAH tersinkron ke stok_warna (mis. data lama dari sebelum logic
// auto-sync di produk/api.js saveProduct ada, atau drift data lainnya),
// kombinasi itu tidak pernah muncul sbg baris apa pun di sini — kartu
// produk (atau satu warna spesifiknya) jadi terlihat kosong ("Belum ada
// data stok untuk produk ini") walau warnanya sudah ada di data produk,
// dan user tidak pernah bisa mengisi nilainya lewat Stok Opname.
//
// Fix: sintesis baris PLACEHOLDER (stok 0) utk tiap kombinasi ukuran aktif
// (dari product.variants — sudah persis sama dgn activeSet yg dipakai
// saveProduct utk sinkronisasi stok_warna normal, lihat produk/api.js)
// × warna (dari product.warna) yg belum punya baris stok_warna nyata,
// supaya user tetap bisa langsung input nilainya di sini seperti baris
// asli. Baris placeholder diberi id sintetik (BUKAN uuid asli, lihat
// syntheticStokId) yg di-decode balik oleh saveStokOpname() di api.js saat
// disimpan — supaya Supabase yg generate id asli lewat unique constraint
// (kode,size,warna), bukan menerima id palsu di kolom uuid.

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

/**
 * fillMissingStokRows — tambahkan baris placeholder (stok 0, id sintetik)
 * utk kombinasi ukuran aktif × warna produk yg belum ada baris stok_warna
 * nyatanya. `existingRows` TIDAK dimutasi.
 */
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

// Konfigurasi 3 kartu grand-total (sekaligus filter lokasi) di header.
export const MKT_CARDS = [
  {
    key: "gudang",
    lbl: "GD",
    name: "Gudang",
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    activeBorder: "border-sky-400 dark:border-sky-500",
    inactiveBorder: "border-transparent",
  },
  {
    key: "cideng",
    lbl: "CD",
    name: "Cideng",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    activeBorder: "border-violet-400 dark:border-violet-500",
    inactiveBorder: "border-transparent",
  },
  {
    key: "tegalgubug",
    lbl: "TG",
    name: "Tegal",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    activeBorder: "border-rose-400 dark:border-rose-500",
    inactiveBorder: "border-transparent",
  },
];
