import { supabase } from "@deera/shared/lib/supabase";

export async function fetchBukuPotonganData() {
  const [stokRes, expRes, soldRes] = await Promise.all([
    supabase.from("stok_warna").select("kode, size, warna, gudang, cideng, tegalgubug"),
    supabase.from("expected_stok").select("kode, size, warna, expected_qty"),
    supabase.rpc("get_sold_summary_by_variant"),
  ]);
  return {
    stokRows: stokRes.data ?? [],
    expectedRows: expRes.data ?? [],
    soldMap: soldRes.data ?? {},
    tableError: expRes.error?.code === "42P01",
  };
}

export async function upsertExpectedStok(rows) {
  const upsertRows = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await supabase
    .from("expected_stok")
    .upsert(upsertRows, { onConflict: "kode,size,warna" });
  if (error) throw error;
  return upsertRows;
}
