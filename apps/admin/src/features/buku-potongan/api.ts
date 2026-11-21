import { supabase } from "@deera/shared/lib/supabase";
import type { BukuPotonganData, ExpectedStokRow } from "./schema";

export async function fetchBukuPotonganData(): Promise<BukuPotonganData> {
  const [stokRes, expRes, soldRes, dikirimRes] = await Promise.all([
    supabase.from("stok_warna").select("kode, size, warna, gudang, cideng, tegalgubug"),
    supabase.from("expected_stok").select("kode, size, warna, expected_qty"),
    supabase.rpc("get_sold_summary_by_variant"),
    // Keep yang sudah "terkirim" (stok sudah keluar) tapi belum dibayar —
    // DIPISAH dari soldMap (yang sekarang murni sales lagi), supaya admin
    // bisa bedakan "sudah lunas" vs "sudah keluar tapi belum lunas".
    supabase.rpc("get_keep_terkirim_summary_by_variant"),
  ]);
  return {
    stokRows: stokRes.data ?? [],
    expectedRows: expRes.data ?? [],
    soldMap: soldRes.data ?? {},
    dikirimMap: dikirimRes.data ?? {},
    tableError: expRes.error?.code === "42P01",
  };
}

export async function upsertExpectedStok(rows: ExpectedStokRow[]) {
  const upsertRows = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await supabase
    .from("expected_stok")
    .upsert(upsertRows, { onConflict: "kode,size,warna" });
  if (error) throw error;
  return upsertRows;
}
