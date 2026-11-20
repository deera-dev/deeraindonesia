import { LOCATIONS } from "@deera/shared/lib/marketDay";
import { supabase } from "@deera/shared/lib/supabase";

export async function moveStokLokasi({ fromLocation, toLocation }) {
  if (!LOCATIONS.includes(fromLocation) || !LOCATIONS.includes(toLocation)) {
    throw new Error("Lokasi tidak valid.");
  }
  if (fromLocation === toLocation) {
    throw new Error("Lokasi asal dan tujuan tidak boleh sama.");
  }

  // Identitas audit (user_email/user_name) sekarang diambil RPC dari
  // auth.uid() -> profiles, bukan dikirim dari sini lagi — lihat
  // supabase/migrations/20261120_move_stok_lokasi_identity.sql.
  const { data, error } = await supabase.rpc("move_stok_lokasi", {
    p_from: fromLocation,
    p_to: toLocation,
  });

  if (error) throw new Error(error.message);
  return data;
}
