import { z } from "zod";

export const stokLocationSchema = z.enum(["gudang", "cideng", "tegalgubug"]);
export type StokLocation = z.infer<typeof stokLocationSchema>;

export const stokWarnaRowSchema = z.object({
  id: z.string(),
  kode: z.string(),
  size: z.string(),
  warna: z.string().nullable(),
  gudang: z.number(),
  cideng: z.number(),
  tegalgubug: z.number(),
});

export type StokWarnaRow = z.infer<typeof stokWarnaRowSchema>;
export const stokWarnaRowsSchema = z.array(stokWarnaRowSchema);
