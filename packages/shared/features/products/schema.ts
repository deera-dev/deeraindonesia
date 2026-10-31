import { z } from "zod";

export const productVariantSchema = z.object({
  size: z.string(),
  harga: z.number(),
  ld: z.number().optional(),
  pb: z.number().optional(),
});

const warnaImageEntrySchema = z
  .object({
    image: z.string().optional(),
    detail: z.array(z.string()).optional(),
  })
  .passthrough();

export const productSchema = z.object({
  // Primary key is `kode` (text) - there is no `id` column on this table,
  // verified against the live schema (information_schema.columns /
  // table_constraints), not from CLAUDE.md's documentation which is stale
  // on this point.
  kode: z.string(),
  nama: z.string(),
  bahan: z.string().nullable(),
  hpp: z.number().nullable(),
  image: z.string().nullable(),
  video: z.string().nullable(),
  seri_warna: z.string().nullable(),
  detail: z.array(z.string()),
  variants: z.array(productVariantSchema),
  warna: z.array(z.string()),
  warna_images: z.record(z.string(), warnaImageEntrySchema).nullable(),
  position: z.number().nullable(),
  created_at: z.string(),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Product = z.infer<typeof productSchema>;

export const productsResponseSchema = z.array(productSchema);
