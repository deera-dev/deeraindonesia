import { z } from "zod";

export const profileSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;
