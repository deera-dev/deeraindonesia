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
  "Super Jumbo": "text-fuchsia-500 dark:text-fuchsia-400",
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


// ── Hitung per produk (redesign 2026-10-08) ─────────────────────────────────
// Satu lokasi dipilih dulu; tiap produk dihitung di layar sendiri lalu disimpan
// sendiri. Total per ukuran boleh diisi dulu, warna menyusul: sisa yang belum
// dibagi ke warna disimpan di baris warna "_" (ditandai "belum masukin warna").
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

// "" / null → null (belum diisi); selain itu bilangan bulat >= 0.
export function parseCount(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  return Math.max(0, parseInt(raw, 10) || 0);
}

/**
 * computeSizeCount — hasil hitung satu ukuran di satu lokasi.
 *  sizeRows : baris stok_warna ukuran ini (boleh berisi baris "_")
 *  entries  : { [rowId]: string } angka yang diketik per baris warna
 *  totalRaw : string total ukuran (opsional; "" = tidak diisi)
 * Aturan sisa "belum berwarna":
 *  - total diisi  → sisa = max(0, total − jumlah warna)
 *  - total kosong → sisa lama berkurang sebesar penambahan warna (warna "mengikuti")
 */
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
  const changes = [...items.map((it) => ({ row: it.row, old: it.old, next: it.next })), ...(pending ? [pending] : [])]
    .filter((c) => c.next !== c.old);
  const total = colorSum + (pending ? pending.next : 0);
  const systemTotal = items.reduce((s, it) => s + it.old, 0) + (pending ? pending.old : 0);
  return { items, hasColors, pending, colorSum, total, systemTotal, over, changes };
}

// { [rowId]: { [loc]: next } } untuk saveStokOpname().
export function buildChanged(changes, loc) {
  const out = {};
  for (const c of changes) out[c.row.id] = { [loc]: c.next };
  return out;
}

// Total stok sebuah produk di satu lokasi (semua ukuran/warna).
export function productLocTotal(rows, loc) {
  return rows.reduce((s, r) => s + (r[loc] ?? 0), 0);
}

// Status baris produk di daftar: "belum" | "sudah" | "selisih".
export function productStatus(counted) {
  if (!counted) return "belum";
  return counted.selisih !== 0 ? "selisih" : "sudah";
}

export function pendingWarnaPcs(rows, loc) {
  if (!rows.some((r) => r.warna !== NO_WARNA)) return 0;
  return rows.filter((r) => r.warna === NO_WARNA).reduce((s, r) => s + (r[loc] ?? 0), 0);
}

// ── Info Buku Potongan (jumlah dipotong − terjual = seharusnya masih ada) ─────
// Angkanya untuk SEMUA lokasi (buku potongan tidak membedakan lokasi).
export function bukuKey(kode, size, warna) {
  return `${kode}__${size}__${warna}`;
}

/** expectedRows: [{kode,size,warna,expected_qty}]; soldMap: {kode:{size:{warna:net}}} */
export function buildBukuMap(expectedRows = [], soldMap = {}) {
  const map = {};
  for (const r of expectedRows) {
    const warna = r.warna ?? NO_WARNA;
    const expected = r.expected_qty ?? 0;
    const sold = soldMap?.[r.kode]?.[r.size]?.[warna] ?? 0;
    map[bukuKey(r.kode, r.size, warna)] = { expected, sold, seharusnya: Math.max(0, expected - sold) };
  }
  return map;
}

/** Ringkasan buku potongan utk sekumpulan baris (satu ukuran / satu produk); null kalau tak ada data. */
export function bukuSummary(map, rows) {
  let n = 0;
  const tot = { expected: 0, sold: 0, seharusnya: 0 };
  for (const r of rows) {
    const b = map?.[bukuKey(r.kode, r.size, r.warna)];
    if (!b) continue;
    n += 1;
    tot.expected += b.expected;
    tot.sold += b.sold;
    tot.seharusnya += b.seharusnya;
  }
  return n ? tot : null;
}
