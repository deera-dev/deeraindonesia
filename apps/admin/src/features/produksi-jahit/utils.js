
export const STATUS_COLUMNS = [
  { key: "belum_diterima", label: "Belum Diterima" },
  { key: "ready_finishing", label: "Siap Finishing" },
];

export function statusLabel(status) {
  return status === "ready_finishing" ? "Siap Finishing" : "Belum Diterima";
}

export function groupByStatus(cards) {
  const groups = { belum_diterima: [], ready_finishing: [] };
  for (const c of cards ?? []) {
    (c?.status === "ready_finishing" ? groups.ready_finishing : groups.belum_diterima).push(c);
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

export function cardWarnaLabel(warna) {
  return warna === "_" ? "(tanpa warna)" : warna;
}

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

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function parseJahitQr(text) {
  const match = String(text ?? "").match(UUID_RE);
  return match ? match[0] : null;
}

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
