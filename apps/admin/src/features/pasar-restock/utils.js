// utils.js — Pure helpers fitur pasar-restock. Tidak ada I/O.

// ── Aturan bisnis (dikonfirmasi Denny, 2026-08) ───────────────────────────────
// "Menipis": bukan soal rasio lagi, tapi target JUMLAH FISIK yang biasa dibawa
// ke pasar per size×warna — Denny selalu bawa "3 seri" (3 pcs) per warna ke
// pasar tujuan. Kalau stok di pasar itu untuk satu size×warna < 3 pcs DAN
// masih ada stok di lokasi lain yang bisa dibawa, itu "menipis" dan perlu
// direstock sampai ke 3.
//
// Kasus khusus: kalau TOTAL stok sistem (semua lokasi digabung) untuk
// size×warna itu sendiri sudah < 3, target otomatis turun jadi "bawa semua
// yang ada" (tidak mungkin capai 3) — ini ditandai `hampirHabis`, karena
// kalau besok pindah pasar (mis. Cideng → Tegalgubug), sisa stok itu harus
// dibawa balik ke gudang dulu baru dibawa lagi ke pasar berikutnya (barangnya
// memang mau habis, bukan sekadar kurang restock).
export const TARGET_SERI_QTY = 3;

// "Tidak bergerak": tidak ada penjualan (type="sale") di pasar tsb dalam N
// hari/kunjungan terakhir.
export const TIDAK_BERGERAK_DAYS = 14;

export const MARKETS = ["cideng", "tegalgubug"];

export function totalStok(row) {
  return (row.gudang || 0) + (row.cideng || 0) + (row.tegalgubug || 0);
}

// Pasar "lain" selain target — dipakai untuk breakdown redistribusi info.
// market di luar MARKETS (mis. "gudang", null) tidak punya "pasar lain" yang
// jelas — return null daripada menebak.
export function otherMarket(market) {
  if (!MARKETS.includes(market)) return null;
  return MARKETS.find((m) => m !== market) ?? null;
}

// Target realistis untuk size×warna ini di pasar tujuan: normalnya 3, tapi
// kalau total stok sistemnya sendiri < 3, target turun ke total itu (tidak
// mungkin bawa lebih dari yang ada).
export function restockTarget(row) {
  return Math.min(TARGET_SERI_QTY, totalStok(row));
}

// Berapa pcs yang masih perlu dibawa ke pasar tujuan supaya capai target.
export function restockNeeded(row, market) {
  if (!market) return 0;
  const marketQty = row[market] || 0;
  return Math.max(restockTarget(row) - marketQty, 0);
}

export function isMenipis(row, market) {
  if (!market) return false;
  return restockNeeded(row, market) > 0;
}

// Total stok sistem (semua lokasi) untuk size×warna ini sudah di bawah
// target 3 — artinya barangnya sendiri mau habis, bukan cuma soal distribusi.
export function isHampirHabis(row) {
  return totalStok(row) < TARGET_SERI_QTY;
}

export function isTidakBergerak(row, market, soldKodesSet) {
  if (!market) return false;
  const marketQty = row[market] || 0;
  if (marketQty <= 0) return false;
  return !soldKodesSet.has(row.kode);
}

// ── Kelompokkan baris stok_warna (per kode × size × warna) jadi SATU KARTU per
// kode, TAPI tetap simpan rincian tiap size/warna di dalamnya ────────────────
// Redesign 2026-08 (2 putaran feedback Denny):
// 1. "terlalu banyak list dengan kode yang sama" → satu kode = satu kartu,
//    bukan satu kartu per baris stok_warna.
// 2. "jadi ga keliatan butuhnya warna apa dan yang sudah ada warna apa" →
//    TAPI kartu itu tidak boleh cuma angka total — rincian per size/warna
//    (dan status menipis/cukup per warna) tetap harus terlihat DI DALAM
//    kartu, supaya admin tahu persis warna mana yang perlu dibawa vs warna
//    mana yang stoknya di pasar itu sudah cukup.
function groupRowsByKode(stokRows) {
  const map = new Map();
  for (const r of stokRows ?? []) {
    if (!r?.kode) continue;
    if (!map.has(r.kode)) map.set(r.kode, []);
    map.get(r.kode).push(r);
  }
  return map;
}

// ── Bangun daftar "Perlu Direstock" untuk pasar tujuan ────────────────────────
// Catatan: SENGAJA tidak melihat/lookup products.nama sama sekali — halaman
// ini identifikasi produk pakai `kode` langsung (permintaan Denny 2026-08:
// "hindari product.name, kita tidak menggunakan itu sama sekali").
// Return: 1 kartu per kode — `details` berisi SEMUA size/warna kode itu yang
// ada di pasar/gudang/pasar lain, masing-masing ditandai `menipis` true/false
// (true = perlu dibawa, false = stok di pasar ini sudah cukup) berdasarkan
// target 3 pcs/warna (lihat isMenipis di atas, bukan rasio lagi).
export function buildRestockList(stokRows, market) {
  const other = otherMarket(market);
  const cards = [];

  for (const [kode, rows] of groupRowsByKode(stokRows)) {
    const details = rows.map((r) => {
      const total = totalStok(r);
      const marketQty = r[market] || 0;
      const target = restockTarget(r);
      const butuh = Math.max(target - marketQty, 0);
      return {
        size: r.size,
        warna: r.warna && r.warna !== "_" ? r.warna : null,
        marketQty,
        gudangQty: r.gudang || 0,
        otherQty: other ? r[other] || 0 : 0,
        otherMarket: other,
        total,
        target,
        butuh,
        menipis: butuh > 0,
        hampirHabis: isHampirHabis(r),
      };
    });

    const menipisDetails = details.filter((d) => d.menipis);
    if (menipisDetails.length === 0) continue; // kode ini aman semua, tidak perlu masuk daftar

    details.sort((a, b) => (a.menipis === b.menipis ? b.butuh - a.butuh : a.menipis ? -1 : 1));
    const maxButuh = Math.max(...menipisDetails.map((d) => d.butuh));
    const anyHampirHabis = menipisDetails.some((d) => d.hampirHabis);

    cards.push({ kode, details, maxButuh, anyHampirHabis });
  }

  // Prioritas: yang hampir habis (barang mau abis, harus dibawa semua &
  // butuh perlakuan khusus tiap pindah pasar) duluan, lalu yang butuh
  // paling banyak dibawa, lalu tiebreak alfabetis.
  return cards.sort(
    (a, b) =>
      Number(b.anyHampirHabis) - Number(a.anyHampirHabis) ||
      b.maxButuh - a.maxButuh ||
      a.kode.localeCompare(b.kode),
  );
}

// ── Bangun daftar "Tidak Bergerak" untuk pasar tujuan ─────────────────────────
// Return: 1 kartu per kode — `details` berisi tiap size/warna yang ada stok
// di pasar ini (marketQty > 0) dan kodenya belum laku sama sekali di pasar
// ini selama window (soldKodes dicek per-kode, bukan per-warna — lihat
// fetchSoldKodesAtLocation di api.js).
export function buildTidakBergerakList(stokRows, market, soldKodes = []) {
  const soldSet = new Set(soldKodes);
  const cards = [];

  for (const [kode, rows] of groupRowsByKode(stokRows)) {
    const details = rows
      .filter((r) => isTidakBergerak(r, market, soldSet))
      .map((r) => ({
        size: r.size,
        warna: r.warna && r.warna !== "_" ? r.warna : null,
        marketQty: r[market] || 0,
      }));
    if (details.length === 0) continue;

    details.sort((a, b) => b.marketQty - a.marketQty);
    const totalMarketQty = details.reduce((sum, d) => sum + d.marketQty, 0);

    cards.push({ kode, details, totalMarketQty });
  }

  return cards.sort((a, b) => b.totalMarketQty - a.totalMarketQty || a.kode.localeCompare(b.kode));
}

// ── Pasar tujuan default: pasar yang buka BESOK (H-1 dari hari ini) ───────────
// Senin(1)/Kamis(4) → Cideng, Jumat(5) → Tegalgubug, hari lain → null (biarkan
// user pilih manual — tidak ada pasar besok).
export function getDefaultTargetMarket(today = new Date()) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.getDay();
  if (day === 1 || day === 4) return "cideng";
  if (day === 5) return "tegalgubug";
  return null;
}

export function marketLabel(market) {
  if (market === "cideng") return "Cideng";
  if (market === "tegalgubug") return "Tegalgubug";
  return "-";
}
