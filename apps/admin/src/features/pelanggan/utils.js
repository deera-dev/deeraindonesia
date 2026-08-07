/**
 * features/pelanggan/utils.js
 * Pure helpers untuk fitur riwayat pembelian pelanggan.
 */

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * groupSaleItems(items)
 *
 * Satu baris `sale.items[]` ("item") SUDAH merepresentasikan satu
 * kode×size (persis kunci cart POS `${kode}-${size}`, lihat
 * apps/pos/src/features/kasir/hooks.js confirmWarna()) — `harga` disimpan
 * SEKALI per item, seragam utk semua warna di dalamnya, BUKAN per warna.
 * Jadi "beda warna, kode sama" TIDAK PERNAH jadi 2 entri terpisah di
 * `items[]` untuk kode+size yang sama — cukup ambil qty per warna sebagai
 * breakdown, TANPA split jadi baris terpisah (beda dari versi lama
 * `flattenSaleItems` yang salah pecah 1 item jadi N baris per warna).
 *
 * qty per item bisa dalam salah satu dari 2 bentuk (lihat catatan
 * sales_flat() di supabase/migrations/20260712_analytics_phase1_rpc.sql):
 *   (a) flat: {kode, size, harga, hpp, qty}
 *   (b) per-warna: {kode, size, harga, hpp, warna: [{nama, qty}, ...]}
 * Array `warna` KOSONG `[]` dianggap kasus FLAT (fallback ke item.qty),
 * BUKAN nol baris — sama seperti effQty() di packages/shared/lib/bepUtils.js.
 *
 * Return: satu baris per item (kode×size), qty = TOTAL lintas warna:
 *   [{kode, size, harga, hpp, qty, subtotal, warnaBreakdown}]
 *   warnaBreakdown: [{warna, qty}] — [] kalau item flat (tanpa warna).
 */
export function groupSaleItems(items) {
  return (items ?? []).map((item) => {
    const harga = Number(item.harga) || 0;
    const hpp = Number(item.hpp) || 0;
    let qty = 0;
    let warnaBreakdown = [];
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      warnaBreakdown = item.warna.map((w) => ({ warna: w.nama ?? "-", qty: Number(w.qty) || 0 }));
      qty = warnaBreakdown.reduce((sum, w) => sum + w.qty, 0);
    } else {
      qty = Number(item.qty) || 0;
    }
    return {
      kode: item.kode,
      size: item.size ?? null,
      harga,
      hpp,
      qty,
      subtotal: harga * qty,
      warnaBreakdown,
    };
  });
}

/**
 * matchesSearch(pelanggan, query) — filter nama/no_hp, dipakai di
 * PelangganPage (search box). Pure, tidak menyentuh Supabase.
 */
export function matchesSearch(pelanggan, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (pelanggan.nama ?? "").toLowerCase().includes(q) ||
    (pelanggan.no_hp ?? "").toLowerCase().includes(q)
  );
}
