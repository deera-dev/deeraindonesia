import { supabase } from "../../lib/supabase";

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
