/**
 * utils.js — Helper murni untuk kanban Kartu Jahit.
 */

// Urutan kolom kiri→kanan (desktop) / atas→bawah (mobile). `key` harus
// persis sama dengan CHECK constraint kolom `status` di tabel jahit_cards
// (lihat migration 20260912_jahit_kanban.sql).
export const STATUS_COLUMNS = [
  { key: "belum_assign", label: "Belum Assign" },
  { key: "on_progress", label: "On Progress" },
  { key: "ready_finishing", label: "Ready Finishing" },
];

export function statusLabel(status) {
  return STATUS_COLUMNS.find((c) => c.key === status)?.label ?? status;
}

/** groupByStatus — kelompokkan kartu ke 3 kolom, urutan dalam tiap kolom
 * kode_produk lalu size (mengikuti urutan `sizes` batch, jadi urutan
 * created_at ascending per batch cukup, TIDAK perlu sort ulang manual). */
export function groupByStatus(cards) {
  const groups = { belum_assign: [], on_progress: [], ready_finishing: [] };
  for (const c of cards ?? []) {
    (groups[c.status] ?? groups.belum_assign).push(c);
  }
  return groups;
}

export function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** cardWarnaLabel — "(tanpa warna)" untuk produk tanpa warna (konvensi "_"),
 * sama seperti BatchCard.jsx. */
export function cardWarnaLabel(warna) {
  return warna === "_" ? "(tanpa warna)" : warna;
}

/**
 * groupCardsByKode — kelompokkan kartu Jahit (kolom aktif MAUPUN arsip
 * Selesai) per kode_produk, supaya kode yang punya banyak baris size×warna
 * tidak mengulang header kode/nama berkali-kali (permintaan Denny 2026-09).
 * Urutan grup & urutan kartu di dalam tiap grup mengikuti urutan `cards`
 * asupan apa adanya (tidak di-sort ulang) — kalau `cards` sudah urut
 * created_at/done_at tertentu dari caller, urutan itu ikut dipertahankan.
 */
export function groupCardsByKode(cards) {
  const order = [];
  const byKode = {};
  for (const c of cards ?? []) {
    if (!byKode[c.kode_produk]) {
      byKode[c.kode_produk] = { kode: c.kode_produk, nama: c.nama_produk, cards: [], totalQty: 0 };
      order.push(c.kode_produk);
    }
    byKode[c.kode_produk].cards.push(c);
    byKode[c.kode_produk].totalQty += Number(c.qty) || 0;
  }
  return order.map((kode) => byKode[kode]);
}

/**
 * filterCards — search kode/nama/warna/penjahit, dipakai di ProduksiJahitPage
 * sebelum digroupByStatus supaya pencarian berlaku ke semua kolom sekaligus.
 */
export function filterCards(cards, search) {
  const q = (search ?? "").trim().toLowerCase();
  if (!q) return cards ?? [];
  return (cards ?? []).filter((c) => {
    return (
      (c.kode_produk ?? "").toLowerCase().includes(q) ||
      (c.nama_produk ?? "").toLowerCase().includes(q) ||
      (c.size ?? "").toLowerCase().includes(q) ||
      (c.warna ?? "").toLowerCase().includes(q) ||
      (c.karyawan_nama ?? "").toLowerCase().includes(q)
    );
  });
}
