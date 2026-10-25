import { supabase } from "@deera/shared/lib/supabase";
import { LOCATIONS } from "@deera/shared/lib/marketDay";

export async function moveStokLokasi({ fromLocation, toLocation, actorEmail, actorName }) {
  if (!LOCATIONS.includes(fromLocation) || !LOCATIONS.includes(toLocation)) {
    throw new Error("Lokasi tidak valid.");
  }
  if (fromLocation === toLocation) {
    throw new Error("Lokasi asal dan tujuan tidak boleh sama.");
  }

  const { data, error } = await supabase.rpc("move_stok_lokasi", {
    p_from: fromLocation,
    p_to: toLocation,
    p_actor_email: actorEmail ?? null,
    p_actor_name: actorName ?? "-",
  });

  if (error) throw new Error(error.message);
  return data;
}
