import { z } from "zod";

export const transferLocationSchema = z.enum(["gudang", "cideng", "tegalgubug"]);

export const transferItemSchema = z.object({
  kode: z.string(),
  size: z.string(),
  warna: z.string().nullable().optional(),
  qty: z.number(),
});

export const transferStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const transferSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  transfer_no: z.string(),
  from_location: z.string(),
  to_location: z.string(),
  items: z.array(transferItemSchema),
  notes: z.string().nullable(),
  status: transferStatusSchema,
  created_by: z.string().nullable(),
  created_by_name: z.string().nullable(),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  rejected_by: z.string().nullable(),
  rejected_at: z.string().nullable(),
});

export type TransferItem = z.infer<typeof transferItemSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type TransferStatus = z.infer<typeof transferStatusSchema>;

export const transfersResponseSchema = z.array(transferSchema);
