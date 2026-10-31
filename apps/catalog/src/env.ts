import { z } from "zod";

const envSchema = z.object({
  VITE_ADMIN_URL: z.url().default("https://admin.deera.id"),
  VITE_GTM_ID: z.string().optional(),
  VITE_GA_MEASUREMENT_ID: z.string().optional(),
  DEV: z.boolean(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`[env] Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
