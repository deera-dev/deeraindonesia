import { supabase } from "@deera/shared/lib/supabase";

export async function fetchCalonCustomerList() {
  const { data, error } = await supabase.from("calon_customer").select("*").order("nama");
  if (error) throw error;
  return data ?? [];
}

export async function searchCalonCustomer(query) {
  const q = (query ?? "").trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("calon_customer")
    .select("*")
    .or(`nama.ilike.%${q}%,no_hp.ilike.%${q}%`)
    .order("nama")
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function createCalonCustomer({ nama, no_hp, catatan }) {
  const namaTrim = (nama ?? "").trim();
  if (!namaTrim) throw new Error("Nama calon customer wajib diisi.");
  const payload = {
    nama: namaTrim,
    no_hp: no_hp?.trim() || null,
    catatan: catatan?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("calon_customer").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateCalonCustomer(id, patch) {
  if (!id) throw new Error("id calon customer wajib diisi.");
  const payload = { updated_at: new Date().toISOString() };
  if ("nama" in patch) payload.nama = (patch.nama ?? "").trim();
  if ("no_hp" in patch) payload.no_hp = patch.no_hp?.trim() || null;
  if ("catatan" in patch) payload.catatan = patch.catatan?.trim() || null;
  const { data, error } = await supabase
    .from("calon_customer")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalonCustomer(id) {
  if (!id) throw new Error("id calon customer wajib diisi.");
  const { error } = await supabase.from("calon_customer").delete().eq("id", id);
  if (error) throw error;
}
