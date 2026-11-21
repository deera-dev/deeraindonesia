import { z } from "zod";

export interface ProductVariant {
  size: string;
  ld: number;
  pb: number;
  harga: number;
}

export interface StokByLocation {
  gudang: number;
  cideng: number;
  tegalgubug: number;
  ngorder?: number;
}

export type StokMap = Record<string, StokByLocation>;
export type SoldQtyMap = Record<string, number>;
export type ProductBadgeMap = Record<string, string>;

export interface SalesBySizeEntry {
  gudang: number;
  cideng: number;
  tegalgubug: number;
  total: number;
}
export type SalesByKodeMap = Record<string, SalesBySizeEntry>;

export interface SalesDetailRow {
  id: string;
  created_at: string;
  buyer_name: string | null;
  buyer_hp: string | null;
  location: string;
  qty: number;
}

export type ProducedByKodeMap = Record<string, number>;

export type StokWarnaByKodeMap = Record<string, Record<string, StokByLocation>>;

// Baris achievements/price-history belum dipakai komponen manapun yang
// sudah dikonversi TS - shape persis ditambahkan pas giliran komponennya
// (ProductChangeHistory dkk) dikonversi.
export type ProductAchievementRow = Record<string, unknown>;
export type ProductPriceHistoryRow = Record<string, unknown>;

export interface ProductBadgeReasonRow {
  reason: string | null;
}

export interface ProductBadgeHistoryRow {
  badge: string;
  first_seen: string;
  last_seen: string;
  days?: number;
  reason?: string | null;
}

export const productVariantInputSchema = z.object({
  size: z.string(),
  ld: z.number(),
  pb: z.number(),
  harga: z.number(),
});

export const warnaRenameSchema = z.object({
  from: z.string(),
  to: z.string(),
});

// Payload yang dikirim ke Edge Function produk-crud (action "save").
export const saveProductInputSchema = z.object({
  isEdit: z.boolean(),
  originalKode: z.string().nullable(),
  finalKode: z.string(),
  nama: z.string(),
  image: z.string().nullable(),
  seriWarna: z.string().nullable(),
  video: z.string().nullable(),
  detail: z.array(z.string()),
  bahan: z.string(),
  variants: z.array(productVariantInputSchema),
  hpp: z.number(),
  warna: z.array(z.string()),
  warnaRenames: z.array(warnaRenameSchema),
});
export type SaveProductInput = z.infer<typeof saveProductInputSchema>;

// saveProduct() mengembalikan payload yang dikonstruksi client (bukan
// respons mentah dari Edge Function) - perilaku lama, dipertahankan apa
// adanya, bukan hal baru dari konversi TS ini.
export interface SaveProductPayload {
  kode: string;
  nama: string;
  image: string | null;
  seri_warna: string | null;
  video: string | null;
  detail: string[];
  bahan: string;
  variants: ProductVariant[];
  hpp: number;
  warna: string[];
}

export interface MediaFileField {
  type: "url" | "file";
  url?: string;
  file?: File;
}

export interface SaveProductParams {
  isEdit: boolean;
  originalKode: string | null;
  finalKode: string;
  fields: { nama: string; bahan: string; hpp: string };
  mainImage: MediaFileField | null;
  seriWarnaImage: MediaFileField | null;
  videoFile: MediaFileField | null;
  detailImages: MediaFileField[];
  warna: string[];
  warnaRenames?: Array<{ from: string; to: string }>;
  activeSet: Set<string>;
  hargaMap: Record<string, string>;
}
