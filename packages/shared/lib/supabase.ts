import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const WARN_MESSAGE =
  "[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set di .env";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().min(1),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.warn(WARN_MESSAGE);
  throw new Error(WARN_MESSAGE);
}

export const supabase = createClient(
  parsed.data.VITE_SUPABASE_URL,
  parsed.data.VITE_SUPABASE_ANON_KEY,
);
