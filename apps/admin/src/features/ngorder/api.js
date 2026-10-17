import { supabase } from "@deera/shared/lib/supabase";

export async function fetchTokoList() {
  const { data, error } = await supabase.from("toko").select("*").order("nama");
  if (error) throw error;
  return data ?? [];
}

export async function createToko({
  nama,
  alamat,
  kontak_nama,
  no_hp,
  catatan,
  daerah,
  media_sosial,
  status_approach,
  kesan,
}) {
  const namaTrim = (nama ?? "").trim();
  if (!namaTrim) throw new Error("Nama toko wajib diisi.");
  const payload = {
    nama: namaTrim,
    alamat: alamat?.trim() || null,
    kontak_nama: kontak_nama?.trim() || null,
    no_hp: no_hp?.trim() || null,
    catatan: catatan?.trim() || null,
    daerah: daerah?.trim() || null,
    media_sosial: media_sosial?.trim() || null,
    status_approach: status_approach === "sudah" ? "sudah" : "belum",
    kesan: status_approach === "sudah" ? kesan || null : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("toko").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateToko(id, patch) {
  if (!id) throw new Error("id toko wajib diisi.");
  const payload = { updated_at: new Date().toISOString() };
  if ("nama" in patch) payload.nama = (patch.nama ?? "").trim();
  if ("alamat" in patch) payload.alamat = patch.alamat?.trim() || null;
  if ("kontak_nama" in patch) payload.kontak_nama = patch.kontak_nama?.trim() || null;
  if ("no_hp" in patch) payload.no_hp = patch.no_hp?.trim() || null;
  if ("catatan" in patch) payload.catatan = patch.catatan?.trim() || null;
  if ("daerah" in patch) payload.daerah = patch.daerah?.trim() || null;
  if ("media_sosial" in patch) payload.media_sosial = patch.media_sosial?.trim() || null;
  if ("status_approach" in patch) {
    payload.status_approach = patch.status_approach === "sudah" ? "sudah" : "belum";
    if (payload.status_approach === "belum") payload.kesan = null;
  }
  if ("kesan" in patch && !("status_approach" in patch)) payload.kesan = patch.kesan || null;
  const { data, error } = await supabase.from("toko").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteToko(id) {
  if (!id) throw new Error("id toko wajib diisi.");
  const { error } = await supabase.from("toko").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTokoItems(tokoId) {
  const { data, error } = await supabase
    .from("sampel_kiriman_item")
    .select("*, sampel_kiriman(tanggal, catatan)")
    .eq("toko_id", tokoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createKiriman({ tokoId, tanggal, catatan, items, user }) {
  if (!tokoId) throw new Error("Toko wajib dipilih.");
  if (!items?.length) throw new Error("Pilih minimal satu produk untuk dikirim.");

  const { data: kiriman, error: kirimanErr } = await supabase
    .from("sampel_kiriman")
    .insert({
      toko_id: tokoId,
      tanggal: tanggal || new Date().toISOString().slice(0, 10),
      catatan: catatan?.trim() || null,
      created_by_email: user?.email ?? null,
      created_by_name: user?.name ?? null,
    })
    .select()
    .single();
  if (kirimanErr) throw kirimanErr;

  const rows = items.map((it) => ({
    kiriman_id: kiriman.id,
    toko_id: tokoId,
    kode: it.kode,
    nama: it.nama ?? null,
    status: "pending",
  }));
  const { error: itemsErr } = await supabase.from("sampel_kiriman_item").insert(rows);
  if (itemsErr) throw itemsErr;

  return kiriman;
}

export async function updateItemStatus(itemId, status) {
  const { data, error } = await supabase
    .from("sampel_kiriman_item")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTokoLocation(id, { lat, lng, source }) {
  if (!id) throw new Error("id toko wajib diisi.");
  const { data, error } = await supabase
    .from("toko")
    .update({ lat, lng, geocode_source: source, geocoded_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
