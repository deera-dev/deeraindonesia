import { z } from "zod";

export const stokLocationSchema = z.enum(["gudang", "cideng", "tegalgubug", "ngorder"]);
export type StokLocation = z.infer<typeof stokLocationSchema>;

export const stokWarnaRowSchema = z.object({
  id: z.string(),
  kode: z.string(),
  size: z.string(),
  warna: z.string().nullable(),
  gudang: z.number(),
  cideng: z.number(),
  tegalgubug: z.number(),
  ngorder: z.number(),
});

export type StokWarnaRow = z.infer<typeof stokWarnaRowSchema>;
export const stokWarnaRowsSchema = z.array(stokWarnaRowSchema);
