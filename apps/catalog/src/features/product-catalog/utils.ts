import type { Product } from "@deera/shared/features/products/schema";

export function isBaru(createdAt: string | null | undefined, days = 14): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diffMs = Date.now() - created;
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

export function filterProducts(products: Product[] | null | undefined, query: string): Product[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [];
  return (products ?? []).filter((p) => {
    const kode = (p.kode ?? "").toLowerCase();
    const nama = (p.nama ?? "").toLowerCase();
    return kode.includes(q) || nama.includes(q);
  });
}

export function sortCatalogProducts(products: Product[] | null | undefined): Product[] {
  return [...(products ?? [])]
    .filter((p) => !!p.image)
    .sort((a, b) => {
      const d = (b.created_at ?? "").localeCompare(a.created_at ?? "");
      if (d !== 0) return d;
      return (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" });
    });
}

export interface FilterOptions {
  bahanList: string[];
  ukuranList: string[];
}

export function getFilterOptions(products: Product[] | null | undefined): FilterOptions {
  const bahanSet = new Set<string>();
  const ukuranSet = new Set<string>();
  for (const p of products ?? []) {
    if (p.bahan) bahanSet.add(p.bahan);
    for (const v of p.variants ?? []) {
      if (v.size) ukuranSet.add(v.size);
    }
  }
  return {
    bahanList: [...bahanSet].sort((a, b) => a.localeCompare(b)),
    ukuranList: [...ukuranSet].sort((a, b) => a.localeCompare(b)),
  };
}

export interface FilterAttributes {
  bahan?: string | null;
  ukuran?: string | null;
}

export function filterByAttributes(
  products: Product[] | null | undefined,
  { bahan, ukuran }: FilterAttributes = {},
): Product[] {
  if (!bahan && !ukuran) return products ?? [];
  return (products ?? []).filter((p) => {
    const matchBahan = !bahan || p.bahan === bahan;
    const matchUkuran = !ukuran || (p.variants ?? []).some((v) => v.size === ukuran);
    return matchBahan && matchUkuran;
  });
}

const PERIODE_PRIORITY = ["7d", "30d", "90d", "all"];

export function pickBestPeriode(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null | undefined {
  if (!a) return b;
  if (!b) return a;
  return PERIODE_PRIORITY.indexOf(a) <= PERIODE_PRIORITY.indexOf(b) ? a : b;
}

export const TERLARIS_LABELS: Record<string, string> = {
  "7d": "Terlaris Minggu Ini",
  "30d": "Terlaris Bulan Ini",
  "90d": "Terlaris 3 Bulan",
  all: "Best Seller",
};

export const GROSIR_POINTS = [
  {
    title: "Khusus Grosir",
    body: "Deera melayani toko & reseller yang ingin menjual kembali produk kami.",
  },
  {
    title: "Beli per Seri",
    body: "Setiap model dijual per seri — satu seri berisi semua warna yang tersedia pada model tersebut.",
  },
  {
    title: "Belum Melayani Satuan",
    body: "Mohon maaf, kami belum dapat melayani pembelian satuan maupun pilih warna tertentu.",
  },
];

export const GROSIR_STEPS = [
  "Pilih model favorit Anda di katalog ini.",
  "Hubungi kami via WhatsApp, sebutkan kode model & jumlah seri.",
  "Atau kunjungi langsung lapak kami di Pasar Cideng & Tegalgubug.",
];

export function countSeriWarna(product: { warna?: string[] | null } | null | undefined): number {
  return (product?.warna ?? []).filter((w) => w && w !== "_").length;
}
