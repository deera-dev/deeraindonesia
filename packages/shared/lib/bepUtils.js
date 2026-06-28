/**
 * bepUtils.js — Kalkulasi BEP (Break-Even Point) pasar.
 *
 * Filosofi: hanya "HPP Pasar" (biaya tetap lokasi: transport + sewa lapak)
 * yang punya tabel baru (`lokasi_pasar_biaya`). Semua angka lain — margin
 * per pcs, BEP per lokasi, saldo akumulatif lintas lokasi, target produksi —
 * dihitung LIVE di sini dari data yang sudah ada:
 *   - sales.items[].harga & .hpp   → margin asli per transaksi (bukan angka acuan manual)
 *   - hpp_template.total_hpp      → biaya produksi per pcs (dihitung di pemanggil)
 *   - marketDay.getMarketLocation → jadwal hari pasar (satu sumber kebenaran)
 *
 * Konsep BEP/HPP Pasar/Saldo Akumulatif/Target Produksi diadaptasi dari
 * dokumen referensi, tapi disesuaikan supaya tidak menduplikasi data yang
 * sudah ada di apps/pos — lihat komentar di supabase-migration-bep-lokasi.sql.
 */
import { getMarketLocation, LOCATIONS } from "./marketDay";

const MARKET_LOCATIONS = LOCATIONS.filter((l) => l !== "gudang"); // ["cideng", "tegalgubug"]

/**
 * Nilai acuan biaya pasar (sama dengan seed di supabase-migration-bep-lokasi.sql).
 * Dipakai sebagai (1) fallback kalkulasi BEP selama lokasi belum pernah diatur
 * manual lewat UI "Atur Biaya Pasar", dan (2) placeholder di form-nya — supaya
 * BEP tetap akurat dari awal tanpa Denny harus isi atau jalankan migration
 * dulu, dan field tetap bisa di-override kapan saja.
 */
export const DEFAULT_BIAYA_PASAR = {
  cideng: { transport_per_trip: 180000, sewa_lapak_per_tahun: 50000000 },
  tegalgubug: { transport_per_trip: 1250000, sewa_lapak_per_tahun: 27000000 },
};

// ── Helper internal (mirror apps/pos/src/lib/salesUtils.js) ────────────────
// Diduplikasi sengaja — packages/shared tidak boleh tergantung pada apps/pos.
function effQty(item) {
  if (Array.isArray(item.warna) && item.warna.length > 0) {
    return item.warna.reduce((s, w) => s + (w.qty ?? 0), 0);
  }
  return item.qty ?? 0;
}

function itemProfit(item) {
  return ((item.harga ?? 0) - (item.hpp ?? 0)) * effQty(item);
}

/** Format Date → "YYYY-MM-DD" lokal (bukan UTC, konsisten dgn localDateStr di hooks/useSales.js). */
export function localDateStr(d = new Date()) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/**
 * Hari buka per minggu untuk satu lokasi — DITURUNKAN dari getMarketLocation,
 * tidak disimpan, supaya tidak ada dua sumber kebenaran soal jadwal pasar.
 */
export function getHariBukaPerMinggu(lokasi) {
  let count = 0;
  const base = new Date(2024, 0, 1); // Senin acuan — tanggal spesifik tidak penting, yg penting 7 hari penuh
  for (let i = 0; i < 7; i++) {
    const test = new Date(base);
    test.setDate(base.getDate() + i);
    if (getMarketLocation(test) === lokasi) count++;
  }
  return count;
}

/** HPP Pasar per hari = transport/trip + (sewa lapak/tahun ÷ hari buka/tahun). */
export function getHppPasarPerHari(biayaRow, lokasi) {
  if (!biayaRow) return 0;
  const hariBukaPerTahun = getHariBukaPerMinggu(lokasi) * 52;
  const sewaPerHari = hariBukaPerTahun > 0 ? (biayaRow.sewa_lapak_per_tahun ?? 0) / hariBukaPerTahun : 0;
  return (biayaRow.transport_per_trip ?? 0) + sewaPerHari;
}

/** Rekap HPP Pasar per periode (kartu ringkasan/referensi). */
export function getHppPasarPerPeriode(biayaRow, lokasi) {
  const perHari = getHppPasarPerHari(biayaRow, lokasi);
  const hariBukaPerMinggu = getHariBukaPerMinggu(lokasi);
  return {
    perHari,
    perMinggu: perHari * hariBukaPerMinggu,
    perBulan: perHari * hariBukaPerMinggu * 4.333,
    perTahun: perHari * hariBukaPerMinggu * 52,
    hariBukaPerMinggu,
  };
}

/**
 * Margin per pcs blended dari transaksi REAL (bukan angka acuan manual),
 * sesuai instruksi: dasarnya data transaksi apps/pos yang sudah ada.
 *
 * salesRows: [{date, location, type, items}] — boleh dari SEMUA lokasi (margin
 * dipakai sebagai acuan umum utk menutup ongkos pasar, tidak harus dari
 * transaksi yang persis terjadi di lokasi pasar).
 * windowDays: lookback hari (default 60) — 0/null = pakai semua data.
 * Retur (type === "retur") mengurangi margin & pcs.
 */
export function computeMarginPerPcs(salesRows, { windowDays = 60, today = new Date() } = {}) {
  let rows = salesRows;
  if (windowDays) {
    const since = localDateStr(new Date(today.getTime() - windowDays * 86400000));
    rows = salesRows.filter((s) => (s.date ?? "") >= since);
  }
  let totalMargin = 0,
    totalPcs = 0,
    totalOmzet = 0;
  for (const s of rows) {
    const sign = s.type === "retur" ? -1 : 1;
    for (const item of s.items ?? []) {
      const q = effQty(item);
      totalMargin += sign * itemProfit(item);
      totalPcs += sign * q;
      totalOmzet += sign * (item.harga ?? 0) * q;
    }
  }
  if (totalPcs <= 0) {
    if (windowDays) return computeMarginPerPcs(salesRows, { windowDays: 0, today });
    return { marginPerPcs: 0, hargaJualRataRata: 0, totalPcs: 0 };
  }
  return {
    marginPerPcs: totalMargin / totalPcs,
    hargaJualRataRata: totalOmzet / totalPcs,
    totalPcs,
  };
}

/** BEP pcs & omzet per periode, untuk satu lokasi. */
export function computeBepLokasi(biayaRow, lokasi, marginPerPcs, hargaJualRataRata) {
  const hppPasar = getHppPasarPerPeriode(biayaRow, lokasi);
  if (!marginPerPcs || marginPerPcs <= 0) {
    return {
      pcsPerHari: 0,
      pcsPerMinggu: 0,
      pcsPerBulan: 0,
      pcsPerTahun: 0,
      omzetPerHari: 0,
      omzetPerMinggu: 0,
      omzetPerBulan: 0,
      omzetPerTahun: 0,
      hppPasar,
    };
  }
  const pcsPerHari = hppPasar.perHari / marginPerPcs;
  const pcsPerMinggu = hppPasar.perMinggu / marginPerPcs;
  const pcsPerBulan = hppPasar.perBulan / marginPerPcs;
  const pcsPerTahun = hppPasar.perTahun / marginPerPcs;
  return {
    pcsPerHari,
    pcsPerMinggu,
    pcsPerBulan,
    pcsPerTahun,
    omzetPerHari: pcsPerHari * hargaJualRataRata,
    omzetPerMinggu: pcsPerMinggu * hargaJualRataRata,
    omzetPerBulan: pcsPerBulan * hargaJualRataRata,
    omzetPerTahun: pcsPerTahun * hargaJualRataRata,
    hppPasar,
  };
}

/** Tanggal transaksi pasar paling awal dalam data — titik mulai ledger saldo. */
export function findEarliestMarketDate(salesRows) {
  let earliest = null;
  for (const s of salesRows) {
    if (!MARKET_LOCATIONS.includes(s.location) || !s.date) continue;
    if (!earliest || s.date < earliest) earliest = s.date;
  }
  return earliest;
}

/**
 * Replay saldo BEP akumulatif LINTAS LOKASI, hari demi hari, dari startDate s/d endDate.
 * Saldo negatif = DEFISIT, saldo ≥ 0 = TABUNGAN. Pakai margin ASLI tiap hari
 * (bukan estimasi) — otomatis akurat & ikut ter-update kalau ada retur/edit.
 *
 * PENTING: margin yang dikumpulkan berasal dari SEMUA transaksi apa pun
 * lokasinya — termasuk pesanan yang dicatat di gudang di hari non-pasar.
 * Filosofinya: untung jualan dari mana saja boleh dipakai menutup ongkos
 * pasar, tidak harus dari transaksi yang persis terjadi di lokasi/hari pasar.
 * Ongkos (HPP Pasar: transport + sewa lapak) tetap HANYA dikenakan di hari
 * kalender yang memang hari pasar — hari lain ongkosnya 0.
 *
 * Return: { ledger: [...satu entri per hari sejak startDate...], saldoAkhir }
 */
export function computeSaldoHarian({ salesRows, biayaMap, marginPerPcs, startDate, endDate }) {
  const byDate = {};
  for (const s of salesRows) {
    if (!s.date) continue;
    if (!byDate[s.date]) byDate[s.date] = { marginTerkumpul: 0, pcsLakuAktual: 0 };
    const sign = s.type === "retur" ? -1 : 1;
    for (const item of s.items ?? []) {
      byDate[s.date].marginTerkumpul += sign * itemProfit(item);
      byDate[s.date].pcsLakuAktual += sign * effQty(item);
    }
  }

  const ledger = [];
  let saldo = 0;
  if (!startDate) return { ledger, saldoAkhir: 0 };

  const cur = new Date(startDate + "T00:00:00");
  const end = new Date((endDate ?? localDateStr()) + "T00:00:00");

  while (cur <= end) {
    const tanggal = localDateStr(cur);
    const lokasi = getMarketLocation(cur); // "gudang" kalau bukan hari pasar
    const isMarketDay = lokasi !== "gudang";
    const data = byDate[tanggal] ?? { marginTerkumpul: 0, pcsLakuAktual: 0 };
    const hppPasarHariIni = isMarketDay ? getHppPasarPerHari(biayaMap[lokasi], lokasi) : 0;
    const saldoSebelumnya = saldo;
    const saldoBaru = saldoSebelumnya + data.marginTerkumpul - hppPasarHariIni;
    const targetPcsHariIni =
      marginPerPcs > 0 ? Math.max(0, hppPasarHariIni - saldoSebelumnya) / marginPerPcs : 0;
    ledger.push({
      tanggal,
      lokasi,
      isMarketDay,
      hppPasarHariIni,
      saldoSebelumnya,
      pcsLakuAktual: data.pcsLakuAktual,
      marginTerkumpul: data.marginTerkumpul,
      saldoBaru,
      targetPcsHariIni,
      status: saldoBaru < 0 ? "DEFISIT" : "TABUNGAN",
    });
    saldo = saldoBaru;
    cur.setDate(cur.getDate() + 1);
  }

  return { ledger, saldoAkhir: saldo };
}

/**
 * Target produksi periode berikutnya (default 7 hari ke depan = "minggu depan").
 * Menutup HPP Pasar periode depan dikurangi saldo berjalan — kalau tabungan
 * sudah cukup, hasilnya otomatis 0 (tidak perlu produksi tambahan utk BEP).
 */
export function computeTargetProduksi({
  saldoBerjalan,
  biayaMap,
  marginPerPcs,
  biayaPerPcs,
  hariKeDepan = 7,
}) {
  let hppPasarPeriode = 0;
  const cur = new Date();
  cur.setDate(cur.getDate() + 1); // mulai besok
  for (let i = 0; i < hariKeDepan; i++) {
    const lokasi = getMarketLocation(cur);
    if (lokasi !== "gudang") hppPasarPeriode += getHppPasarPerHari(biayaMap[lokasi], lokasi);
    cur.setDate(cur.getDate() + 1);
  }
  const targetProduksiPcs =
    marginPerPcs > 0 ? Math.max(0, (hppPasarPeriode - saldoBerjalan) / marginPerPcs) : 0;
  const modalBahanDibutuhkan = targetProduksiPcs * (biayaPerPcs ?? 0);
  return { hppPasarPeriode, targetProduksiPcs, modalBahanDibutuhkan };
}
