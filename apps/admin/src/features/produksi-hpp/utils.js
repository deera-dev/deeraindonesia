/**
 * utils.js — Helper murni untuk kalkulasi HPP (tidak ada I/O, tidak ada React).
 */

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

/** Format desimal, hilangkan trailing zeros */
export function fmt4(n) {
  return Number(n)
    .toFixed(4)
    .replace(/\.?0+$/, "");
}

export const LENGTH_UNITS = new Set(["yard", "meter", "m", "cm"]);

export function convertUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return value;
  const norm = (u) => (u === "m" ? "meter" : u);
  const f = norm(fromUnit);
  const t = norm(toUnit);
  if (f === t) return value;
  if (!LENGTH_UNITS.has(f) || !LENGTH_UNITS.has(t)) return value;
  const toMeter = { yard: 0.9144, meter: 1, cm: 0.01 };
  const fromMeter = { yard: 1 / 0.9144, meter: 1, cm: 100 };
  return value * (toMeter[f] ?? 1) * (fromMeter[t] ?? 1);
}

/** Opsi satuan ukur berdasarkan satuan beli */
export function satuanUkurOptions(satuanBeli) {
  if (LENGTH_UNITS.has(satuanBeli)) return ["yard", "meter", "cm"];
  return [satuanBeli];
}

/** Hitung qty_per_baju (dalam satuan beli) dari item */
export function calcQtyPerBaju(item) {
  const qtyRaw = Number(item.qty_dipakai) || 0;
  const nBaju = Math.max(Number(item.untuk_n_baju) || 1, 1);
  const perBaju = qtyRaw / nBaju;
  return convertUnit(perBaju, item.satuan_ukur || item.satuan, item.satuan);
}

/** Normalise item dari DB (backward compat) */
export function normItem(b) {
  const hasTambahan = b.qty_dipakai !== undefined && b.untuk_n_baju !== undefined;
  const jenis = b.jenis ?? (hasTambahan ? "tambahan" : "motif");
  const warna_qtys = b.warna_qtys ?? [];
  // Untuk motif dengan warna_qtys, qty_dipakai = jumlah semua warna
  const qty_dipakai =
    jenis === "motif" && warna_qtys.length > 0
      ? String(warna_qtys.reduce((s, w) => s + (Number(w.qty) || 0), 0))
      : (b.qty_dipakai ?? b.qty_per_baju ?? "");
  return {
    ...b,
    jenis,
    warna_qtys,
    qty_dipakai,
    satuan_ukur: b.satuan_ukur ?? b.satuan ?? "yard",
    untuk_n_baju: b.untuk_n_baju ?? 1,
  };
}

/**
 * biayaLainBreakdown() — daftar SEMUA komponen biaya HPP di luar biaya bahan
 * (kain/motif), sebagai array [{label, val}].
 *
 * Diekstrak dari calcTotal() (bukan fungsi baru terpisah) supaya HANYA ADA
 * SATU tempat yang mendefinisikan komponen apa saja yang membentuk Total HPP.
 * Sebelum ekstraksi ini, breakdown yang ditampilkan ulang di tempat lain
 * (HppTemplateDetailSheet, HPPShareCard) direkonstruksi manual dari field
 * upah_jahit/bordir/biaya_studio/kancing_qty SAJA — tidak menyertakan
 * plastik/hangtag/tali_hangtag/merk/pin/kain_keras/poin_denny/poin_haikal,
 * padahal nilai-nilai itu SUDAH ikut dijumlahkan ke tpl.total_hpp sejak
 * disimpan (lihat calcTotal di bawah). Akibatnya nilai Total HPP yang
 * tersimpan sudah benar, tapi breakdown yang ditampilkan setelah tersimpan
 * terlihat "kurang" dibanding totalnya — termasuk baris Poin yang sama
 * sekali tidak pernah muncul di layar manapun setelah template disimpan.
 * Lihat LAPORAN_INVESTIGASI_HPP_POIN.md untuk kronologi lengkap.
 *
 * `config` di sini BOLEH berupa `tpl.config_snapshot` (nilai Harga Dasar
 * yang dibekukan saat template disimpan) supaya breakdown yang direkonstruksi
 * dari data tersimpan selalu cocok persis dengan total_hpp yang sudah ada —
 * bukan config TERKINI, yang bisa saja sudah berubah nilainya.
 */
export function biayaLainBreakdown({ upah_jahit, bordir, kancing_qty, kancing_extra, biaya_studio, config }) {
  const kancingSatuan = config?.kancing_satuan ?? 500;
  const kancingQty = Number(kancing_qty) || 0;
  const biayaKancing = kancingQty * kancingSatuan;
  // kancing_extra: [{label, qty, harga_per}]
  const extraKancing = (kancing_extra ?? []).filter(k => k.qty > 0 && k.harga_per > 0);

  return [
    { label: "Upah Jahit", val: Number(upah_jahit) || 0 },
    { label: "Bordir", val: Number(bordir) || 0 },
    { label: "Biaya Studio", val: Number(biaya_studio) || 0 },
    { label: `Kancing (${kancingQty} × ${fmtRp(kancingSatuan)})`, val: biayaKancing },
    ...extraKancing.map(k => ({ label: `${k.label || "Kancing lain"} (${k.qty} × ${fmtRp(k.harga_per)})`, val: k.qty * k.harga_per })),
    { label: "Plastik", val: config?.plastik ?? 1800 },
    { label: "Hangtag", val: config?.hangtag ?? 200 },
    { label: "Tali Hangtag", val: config?.tali_hangtag ?? 100 },
    { label: "Merk", val: config?.merk ?? 200 },
    { label: "Pin", val: config?.pin ?? 2800 },
    { label: "Kain Keras", val: config?.kain_keras ?? 200 },
    { label: "Poin Denny", val: config?.poin_denny ?? 10000 },
    { label: "Poin Haikal", val: config?.poin_haikal ?? 10000 },
  ];
}

/**
 * Hitung total HPP.
 * biaya_studio = nilai per baju (sudah dihitung: config.studio / jumlah_baju_studio)
 * Returns { total, biayaKain, breakdown }
 */
export function calcTotal({ bahanItems, upah_jahit, bordir, kancing_qty, kancing_extra, biaya_studio, config }) {
  const biayaKain = bahanItems.reduce(
    (s, b) => s + calcQtyPerBaju(b) * (Number(b.harga_satuan) || 0),
    0,
  );
  const breakdown = biayaLainBreakdown({ upah_jahit, bordir, kancing_qty, kancing_extra, biaya_studio, config });
  const total = Math.round(biayaKain + breakdown.reduce((s, b) => s + b.val, 0));

  return { total, biayaKain, breakdown };
}

// ── Konstanta styling form (dipakai lintas komponen fitur ini) ──────────────
export const fieldCls =
  "px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
export const fieldFullCls = "w-full " + fieldCls;
export const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

// ── Tab halaman ───────────────────────────────────────────────────────────
export const HPP_TABS = [
  { key: "template", label: "Template HPP" },
  { key: "kalkulator", label: "Kalkulator" },
  { key: "harga-dasar", label: "Harga Dasar" },
];

/**
 * getBatchSiblingKodes(batches, kodeProduk) — cari kode produk lain yang
 * diproduksi bersama kodeProduk dalam gelaran (batch_no) yang sama.
 *
 * Dipakai saat Edit HPP (lihat ProduksiHPPPage.jsx openEdit()) untuk
 * otomatis meng-include produk "sepaket" ke sesi edit — supaya biaya
 * produksi & bahan bisa diedit bareng tanpa harus buka form satu per satu
 * (keputusan eksplisit Denny 2026-07: TANPA tombol "+ Tambah Produk"
 * manual di mode edit, murni otomatis berdasarkan batch_no).
 *
 * Kalau kodeProduk sudah diproduksi lebih dari sekali (beberapa batch_no
 * berbeda dari waktu ke waktu), dipakai batch TERBARU (created_at paling
 * baru) sebagai acuan gelaran yang dianggap "batch yang sama" saat ini.
 * Kalau kodeProduk tidak punya data produksi_batch sama sekali (mis. HPP
 * dibuat manual tanpa lewat alur batch), return array kosong — perilaku
 * sama seperti sebelum fungsi ini ada (edit 1 produk saja).
 */
export function getBatchSiblingKodes(batches, kodeProduk) {
  if (!kodeProduk) return [];
  const ownBatches = (batches ?? [])
    .filter((b) => b.kode_produk === kodeProduk && b.batch_no)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const latest = ownBatches[0];
  if (!latest) return [];
  const siblingKodes = new Set();
  for (const b of batches ?? []) {
    if (b.batch_no === latest.batch_no && b.kode_produk && b.kode_produk !== kodeProduk) {
      siblingKodes.add(b.kode_produk);
    }
  }
  return [...siblingKodes];
}

// ── Pengelompokan Harga Dasar (hpp_config) ──────────────────────────────────
// Screen "Harga Dasar" — lihat UX_REDESIGN_TEMPLATE_HPP_HARGA_DASAR.md Bagian B.
// 13 key tetap (seed: supabase/migrations/20260525_produksi.sql), dikelompokkan
// murni di layer UI supaya lebih mudah di-scan (bukan perubahan skema DB).
export const CONFIG_GROUPS = [
  { label: "Ongkos Jahit", keys: ["jahit_midi", "jahit_gamis"] },
  { label: "Bordir & Finishing", keys: ["bordir"] },
  {
    label: "Kemasan & Aksesoris",
    keys: ["plastik", "hangtag", "tali_hangtag", "merk", "pin", "kain_keras", "kancing_satuan"],
  },
  { label: "Studio & Lainnya", keys: ["studio", "poin_denny", "poin_haikal"] },
];

/**
 * Kelompokkan configRows (dari hpp_config) sesuai CONFIG_GROUPS.
 * Key yang belum terdaftar di CONFIG_GROUPS (mis. ditambah langsung di DB
 * tanpa update mapping ini) tetap ditampilkan lewat grup "Lainnya" —
 * defensif, supaya tidak ada nilai yang diam-diam hilang dari tampilan.
 * Grup kosong (tidak ada row-nya) tidak diikutsertakan di hasil.
 */
export function groupConfigRows(rows) {
  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));
  const used = new Set();
  const groups = [];

  for (const g of CONFIG_GROUPS) {
    const groupRows = [];
    for (const key of g.keys) {
      const row = byKey.get(key);
      if (row) {
        groupRows.push(row);
        used.add(key);
      }
    }
    if (groupRows.length > 0) groups.push({ label: g.label, rows: groupRows });
  }

  const sisa = (rows ?? []).filter((r) => !used.has(r.key));
  if (sisa.length > 0) groups.push({ label: "Lainnya", rows: sisa });

  return groups;
}
