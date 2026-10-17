import { supabase } from "@deera/shared/lib/supabase";

export async function fetchPelangganList() {
  const { data, error } = await supabase.from("pelanggan").select("*").order("nama");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSalesByPelanggan(pelangganId) {
  const { data, error } = await supabase
    .from("sales")
    .select("id, date, created_at, type, location, items, discount, total, buyer_name, buyer_hp, created_by_name")
    .eq("pelanggan_id", pelangganId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}


export async function searchPelanggan(query) {
  const q = (query ?? "").trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("pelanggan")
    .select("*")
    .or(`nama.ilike.%${q}%,no_hp.ilike.%${q}%`)
    .order("nama")
    .limit(8);
  if (error) throw error;
  return data ?? [];
}

export async function findPelangganByNama(nama) {
  const q = (nama ?? "").trim();
  if (!q) return null;
  const { data, error } = await supabase
    .from("pelanggan")
    .select("*")
    .ilike("nama", q)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createPelanggan({ nama, no_hp, alamat, ekspedisi_biasa }) {
  const namaTrim = (nama ?? "").trim();
  if (!namaTrim) throw new Error("Nama pelanggan wajib diisi.");
  const payload = {
    nama: namaTrim,
    no_hp: no_hp?.trim() || null,
    alamat: alamat?.trim() || null,
    ekspedisi_biasa: ekspedisi_biasa?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("pelanggan").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePelangganInfo(id, patch) {
  if (!id) throw new Error("id pelanggan wajib diisi.");
  const payload = { updated_at: new Date().toISOString() };
  if (patch.no_hp?.trim()) payload.no_hp = patch.no_hp.trim();
  if (patch.alamat?.trim()) payload.alamat = patch.alamat.trim();
  if (patch.ekspedisi_biasa?.trim()) payload.ekspedisi_biasa = patch.ekspedisi_biasa.trim();
  const { data, error } = await supabase.from("pelanggan").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}


export async function fetchPelangganPins() {
  const { data, error } = await supabase
    .from("pelanggan")
    .select("id, nama, no_hp, alamat, lat, lng, geocode_source")
    .not("lat", "is", null)
    .not("lng", "is", null);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPelangganNeedingGeocode() {
  const { data, error } = await supabase
    .from("pelanggan")
    .select("id, nama, alamat")
    .is("lat", null)
    .not("alamat", "is", null)
    .neq("alamat", "");
  if (error) throw error;
  return data ?? [];
}

export async function fetchPelangganNamaNeedingGeocode() {
  const { data, error } = await supabase
    .from("pelanggan")
    .select("id, nama")
    .is("lat", null)
    .or("alamat.is.null,alamat.eq.");
  if (error) throw error;
  return data ?? [];
}

export async function setPelangganLocation(id, { lat, lng, source }) {
  if (!id) throw new Error("id pelanggan wajib diisi.");
  const { data, error } = await supabase
    .from("pelanggan")
    .update({ lat, lng, geocode_source: source, geocoded_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
