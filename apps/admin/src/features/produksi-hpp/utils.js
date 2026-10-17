
export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

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

export function satuanUkurOptions(satuanBeli) {
  if (LENGTH_UNITS.has(satuanBeli)) return ["yard", "meter", "cm"];
  return [satuanBeli];
}

export function calcQtyPerBaju(item) {
  const qtyRaw = Number(item.qty_dipakai) || 0;
  const nBaju = Math.max(Number(item.untuk_n_baju) || 1, 1);
  const perBaju = qtyRaw / nBaju;
  return convertUnit(perBaju, item.satuan_ukur || item.satuan, item.satuan);
}

export function normItem(b) {
  const hasTambahan = b.qty_dipakai !== undefined && b.untuk_n_baju !== undefined;
  const jenis = b.jenis ?? (hasTambahan ? "tambahan" : "motif");
  const warna_qtys = b.warna_qtys ?? [];
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

export function biayaLainBreakdown({ upah_jahit, bordir, kancing_qty, kancing_extra, biaya_studio, config }) {
  const kancingSatuan = config?.kancing_satuan ?? 500;
  const kancingQty = Number(kancing_qty) || 0;
  const biayaKancing = kancingQty * kancingSatuan;
  const extraKancing = (kancing_extra ?? []).filter(k => k.qty > 0 && k.harga_per > 0);

  return [
    { label: "Upah Jahit", val: Number(upah_jahit) || 0 },
    { label: "Bordir", val: Number(bordir) || 0 },
    { label: "Biaya Studio", val: Number(biaya_studio) || 0 },
    { label: `Kancing (${kancingQty} × ${fmtRp(kancingSatuan)})`, val: biayaKancing },
    ...extraKancing.map(k => ({ label: `${k.label || "Aksesoris lain"} (${k.qty} ${k.satuan || "biji"} × ${fmtRp(k.harga_per)})`, val: k.qty * k.harga_per })),
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

export function calcTotal({ bahanItems, upah_jahit, bordir, kancing_qty, kancing_extra, biaya_studio, config }) {
  const biayaKain = bahanItems.reduce(
    (s, b) => s + calcQtyPerBaju(b) * (Number(b.harga_satuan) || 0),
    0,
  );
  const breakdown = biayaLainBreakdown({ upah_jahit, bordir, kancing_qty, kancing_extra, biaya_studio, config });
  const total = Math.round(biayaKain + breakdown.reduce((s, b) => s + b.val, 0));

  return { total, biayaKain, breakdown };
}

export const fieldCls =
  "px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-skin-accent transition";
export const fieldFullCls = "w-full " + fieldCls;
export const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

export const HPP_TABS = [
  { key: "template", label: "Template HPP" },
  { key: "kalkulator", label: "Kalkulator" },
  { key: "harga-dasar", label: "Harga Dasar" },
];


export function produksiTotalPcsByKode(batches) {
  const map = {};
  for (const b of batches ?? []) {
    if (!b.kode_produk) continue;
    const batchQty = (b.sizes ?? []).reduce(
      (s, sz) => s + (sz.warna ?? []).reduce((ss, w) => ss + (Number(w.qty) || 0), 0),
      0,
    );
    map[b.kode_produk] = (map[b.kode_produk] ?? 0) + batchQty;
  }
  return map;
}

export function resolveJumlahBajuStudio(inputVal, produksiTotalPcs) {
  if (inputVal !== "" && inputVal != null) return Number(inputVal) || 0;
  return Number(produksiTotalPcs) || 0;
}

export function calcBiayaStudioPerBaju(inputVal, produksiTotalPcs, studioConfig) {
  const n = resolveJumlahBajuStudio(inputVal, produksiTotalPcs);
  return n > 0 ? Math.round((Number(studioConfig) || 0) / n) : 0;
}

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

export const CONFIG_GROUPS = [
  { label: "Ongkos Jahit", keys: ["jahit_midi", "jahit_gamis"] },
  { label: "Bordir & Finishing", keys: ["bordir"] },
  {
    label: "Kemasan & Aksesoris",
    keys: ["plastik", "hangtag", "tali_hangtag", "merk", "pin", "kain_keras", "kancing_satuan"],
  },
  { label: "Studio & Lainnya", keys: ["studio", "poin_denny", "poin_haikal"] },
];

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

export function filterAndSortHppTemplates(templates, filter, { products = [], search = "" } = {}) {
  const q = search.trim().toLowerCase();
  const hppMin = filter.hppMin === "" ? null : Number(filter.hppMin);
  const hppMax = filter.hppMax === "" ? null : Number(filter.hppMax);

  const namaByKode = new Map((products ?? []).map((p) => [p.kode, p.nama ?? ""]));
  const kodeOrderIndex = new Map((products ?? []).map((p, i) => [p.kode, i]));

  const filtered = (templates ?? []).filter((tpl) => {
    if (q) {
      const nama = (namaByKode.get(tpl.kode_produk) ?? "").toLowerCase();
      const matchSearch = (tpl.kode_produk ?? "").toLowerCase().includes(q) || nama.includes(q);
      if (!matchSearch) return false;
    }

    if (hppMin !== null || hppMax !== null) {
      const hpp = Number(tpl.total_hpp) || 0;
      if (hppMin !== null && hpp < hppMin) return false;
      if (hppMax !== null && hpp > hppMax) return false;
    }

    return true;
  });

  const byKode = (a, b) => (a.kode_produk ?? "").localeCompare(b.kode_produk ?? "");
  const byHpp = (a, b) => (Number(a.total_hpp) || 0) - (Number(b.total_hpp) || 0);
  const byTerbaruThenNama = (a, b) => {
    const ia = kodeOrderIndex.has(a.kode_produk) ? kodeOrderIndex.get(a.kode_produk) : Infinity;
    const ib = kodeOrderIndex.has(b.kode_produk) ? kodeOrderIndex.get(b.kode_produk) : Infinity;
    return ia !== ib ? ia - ib : byKode(a, b);
  };

  switch (filter.sort) {
    case "kode-az":
      return [...filtered].sort(byKode);
    case "kode-za":
      return [...filtered].sort((a, b) => -byKode(a, b));
    case "hpp-tertinggi":
      return [...filtered].sort((a, b) => -byHpp(a, b));
    case "hpp-terendah":
      return [...filtered].sort(byHpp);
    case "terbaru":
    default:
      return [...filtered].sort(byTerbaruThenNama);
  }
}

const r1 = (n) => Math.round(n * 100) / 100;

export function avgPemakaianBahan(templates) {
  const acc = { motif: [], polos: [] };
  for (const t of templates ?? []) {
    for (const raw of t.bahan_items ?? []) {
      const b = normItem(raw);
      const qty = Number(raw.qty_per_baju);
      if (b.satuan !== "yard" || !(qty > 0)) continue;
      acc[b.jenis === "motif" ? "motif" : "polos"].push({ qty, harga: Number(raw.harga_satuan) || 0 });
    }
  }
  const stat = (list) => {
    if (list.length === 0) return null;
    const qs = list.map((x) => x.qty);
    const hs = list.map((x) => x.harga).filter((h) => h > 0);
    return {
      n: list.length,
      avg: r1(qs.reduce((s, q) => s + q, 0) / qs.length),
      min: r1(Math.min(...qs)),
      max: r1(Math.max(...qs)),
      avgHarga: hs.length ? Math.round(hs.reduce((s, h) => s + h, 0) / hs.length) : null,
    };
  };
  return { motif: stat(acc.motif), polos: stat(acc.polos) };
}

export function avgBiayaTetapTemplate(templates) {
  const list = templates ?? [];
  if (list.length === 0) return { kancingQty: 4, biayaStudio: 0 };
  const avg = (key) => list.reduce((s, t) => s + (Number(t[key]) || 0), 0) / list.length;
  return { kancingQty: Math.round(avg("kancing_qty")), biayaStudio: Math.round(avg("biaya_studio")) };
}

export function biayaTetapKalkulator({ tipe = "gamis", config, templates }) {
  const cfg = config ?? {};
  const upah = tipe === "midi" ? cfg.jahit_midi ?? 35000 : cfg.jahit_gamis ?? 45000;
  const { kancingQty, biayaStudio } = avgBiayaTetapTemplate(templates);
  const rows = biayaLainBreakdown({
    upah_jahit: upah,
    bordir: 0,
    kancing_qty: kancingQty,
    kancing_extra: [],
    biaya_studio: biayaStudio,
    config: cfg,
  }).filter((r) => r.val > 0);
  return { rows, total: rows.reduce((s, r) => s + r.val, 0) };
}

export function hppTargetDari({ mode, hargaJual, marginPct, hppTarget }) {
  const v =
    mode === "jual"
      ? (Number(hargaJual) || 0) * (1 - (Number(marginPct) || 0) / 100)
      : Number(hppTarget) || 0;
  return v > 0 ? Math.round(v) : 0;
}

export function hitungBahanMulti({ hppMaks, biayaTetap, rows }) {
  const target = Number(hppMaks) || 0;
  const list = (rows ?? []).map((r) => ({
    cari: !!r.cari,
    pakai: Number(r.pakai) || 0,
    harga: Number(r.harga) || 0,
  }));
  if (target <= 0 || list.length === 0 || list.some((r) => r.pakai <= 0)) return null;
  const sisa = target - (Number(biayaTetap) || 0);
  const bahanDiketahui = list.filter((r) => !r.cari).reduce((s, r) => s + r.pakai * r.harga, 0);
  const cari = list.filter((r) => r.cari);
  if (cari.length === 0) {
    return { tipe: "cek", hppMaks: Math.round(target), sisa: Math.round(sisa), bahanDiketahui: Math.round(bahanDiketahui), selisih: Math.round(sisa - bahanDiketahui), over: sisa - bahanDiketahui < 0 };
  }
  const budgetCari = sisa - bahanDiketahui;
  const pakaiCari = cari.reduce((s, r) => s + r.pakai, 0);
  return {
    tipe: "cari",
    hppMaks: Math.round(target),
    sisa: Math.round(sisa),
    bahanDiketahui: Math.round(bahanDiketahui),
    budgetCari: Math.round(budgetCari),
    over: budgetCari <= 0,
    hargaMaksPerYard: budgetCari > 0 ? Math.floor(budgetCari / pakaiCari) : 0,
  };
}

export const AKSESORIS_SATUAN = ["biji", "cm", "meter", "pcs"];

