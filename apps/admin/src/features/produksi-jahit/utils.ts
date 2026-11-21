import type { JahitCard, JahitCardStatus, KodeGroup } from "./schema";

export const STATUS_COLUMNS = [
  { key: "belum_diterima", label: "Belum Diterima" },
  { key: "ready_finishing", label: "Siap Finishing" },
];

export function statusLabel(status: JahitCardStatus | string | null | undefined): string {
  return status === "ready_finishing" ? "Siap Finishing" : "Belum Diterima";
}

export function groupByStatus(cards: JahitCard[] | null | undefined): {
  belum_diterima: JahitCard[];
  ready_finishing: JahitCard[];
} {
  const groups: { belum_diterima: JahitCard[]; ready_finishing: JahitCard[] } = {
    belum_diterima: [],
    ready_finishing: [],
  };
  for (const c of cards ?? []) {
    (c?.status === "ready_finishing" ? groups.ready_finishing : groups.belum_diterima).push(c);
  }
  return groups;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function cardWarnaLabel(warna: string | null | undefined): string {
  return warna === "_" ? "(tanpa warna)" : (warna ?? "");
}

export function groupCardsByKode(cards: JahitCard[] | null | undefined): KodeGroup[] {
  const order: string[] = [];
  const byKode: Record<string, KodeGroup> = {};
  for (const c of cards ?? []) {
    if (!byKode[c.kode_produk]) {
      byKode[c.kode_produk] = { kode: c.kode_produk, nama: c.nama_produk, cards: [], totalQty: 0 };
      order.push(c.kode_produk);
    }
    byKode[c.kode_produk]!.cards.push(c);
    byKode[c.kode_produk]!.totalQty += Number(c.qty) || 0;
  }
  return order.map((kode) => byKode[kode]!);
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function parseJahitQr(text: string | null | undefined): string | null {
  const match = String(text ?? "").match(UUID_RE);
  return match ? match[0]! : null;
}

const SITE = "https://deera.id";

export function jahitCardScanUrl(cardId: string): string {
  return `${SITE}/j/${encodeURIComponent(cardId)}`;
}

export function filterCards(
  cards: JahitCard[] | null | undefined,
  search: string | null | undefined,
): JahitCard[] {
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
