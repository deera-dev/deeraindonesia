import { supabase } from "../../lib/supabase";
import { type StokLocation, stokLocationSchema, stokWarnaRowsSchema } from "./schema";

/**
 * `location` ends up as a COLUMN name in the .gt() filter below, not a
 * value - docs/reports/audit-report.md flagged this as using an
 * unvalidated caller string as a column identifier. Validating it against
 * the real location enum first closes that off: an invalid location now
 * fails loudly with a clear Zod error instead of silently becoming a
 * confusing "column not found" PostgREST error.
 */
export async function fetchStokByLocation(location: StokLocation | "" | null | undefined) {
  if (!location) return [];
  const validLocation = stokLocationSchema.parse(location);

  const { data, error } = await supabase
    .from("stok_warna")
    .select("id, kode, size, warna, gudang, cideng, tegalgubug")
    .gt(validLocation, 0)
    .order("kode", { ascending: true })
    .order("size", { ascending: true });

  if (error) throw error;
  return stokWarnaRowsSchema.parse(data ?? []);
}
