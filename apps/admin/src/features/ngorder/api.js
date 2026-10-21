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
  if ("kesan" in patch && payload.status_approach !== "belum") payload.kesan = patch.kesan || null;
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

function actor(user) {
  return { email: user?.email ?? null, nama: user?.name ?? user?.email ?? null };
}

function isBlankKunjungan(row) {
  return row.status === "rencana" && !row.hasil?.trim() && !row.request?.trim() && !row.kesan;
}

export async function fetchRencana() {
  const { data, error } = await supabase
    .from("toko_kunjungan")
    .select("*")
    .eq("aktif", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchKunjunganToko(tokoId) {
  const { data, error } = await supabase
    .from("toko_kunjungan")
    .select("*")
    .eq("toko_id", tokoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((r) => !isBlankKunjungan(r));
}

export async function addRencana({ tokoIds, user }) {
  const ids = [...new Set(tokoIds ?? [])].filter(Boolean);
  if (!ids.length) return [];
  const { data: existing, error: exErr } = await supabase
    .from("toko_kunjungan")
    .select("toko_id")
    .eq("aktif", true)
    .in("toko_id", ids);
  if (exErr) throw exErr;
  const have = new Set((existing ?? []).map((r) => r.toko_id));
  const a = actor(user);
  const rows = ids
    .filter((id) => !have.has(id))
    .map((toko_id) => ({ toko_id, dipilih_oleh_email: a.email, dipilih_oleh_nama: a.nama }));
  const inserted = [];
  for (const row of rows) {
    const { data, error } = await supabase.from("toko_kunjungan").insert(row).select().single();
    if (error && error.code !== "23505") throw error;
    if (data) inserted.push(data);
  }
  return inserted;
}

export async function removeRencana(rows) {
  const list = (rows ?? []).filter(Boolean);
  const blank = list.filter(isBlankKunjungan).map((r) => r.id);
  const keep = list.filter((r) => !isBlankKunjungan(r)).map((r) => r.id);
  if (blank.length) {
    const { error } = await supabase.from("toko_kunjungan").delete().in("id", blank);
    if (error) throw error;
  }
  if (keep.length) {
    const { error } = await supabase
      .from("toko_kunjungan")
      .update({ aktif: false, updated_at: new Date().toISOString() })
      .in("id", keep);
    if (error) throw error;
  }
}

export async function updateKunjungan({ row, patch, user }) {
  if (!row?.id) throw new Error("Kunjungan tidak ditemukan.");
  const now = new Date().toISOString();
  const a = actor(user);
  const payload = { updated_at: now, diubah_oleh_email: a.email, diubah_oleh_nama: a.nama };
  if ("hasil" in patch) payload.hasil = patch.hasil?.trim() || null;
  if ("request" in patch) payload.request = patch.request?.trim() || null;
  if ("kesan" in patch) payload.kesan = patch.kesan || null;
  if ("status" in patch) {
    payload.status = patch.status;
    if (patch.status === "berlangsung" && !row.mulai_at) payload.mulai_at = now;
    if (patch.status === "selesai") {
      payload.selesai_at = now;
      if (!row.mulai_at) payload.mulai_at = now;
    }
    if (patch.status === "rencana") {
      payload.mulai_at = null;
      payload.selesai_at = null;
    }
  }
  const { data, error } = await supabase.from("toko_kunjungan").update(payload).eq("id", row.id).select().single();
  if (error) throw error;
  if (data.status === "selesai") {
    await updateToko(data.toko_id, data.kesan ? { status_approach: "sudah", kesan: data.kesan } : { status_approach: "sudah" });
  }
  return data;
}

export async function markGeocodeFailed(id) {
  const { error } = await supabase
    .from("toko")
    .update({ geocode_source: "gagal", geocoded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export function subscribeNgorder(onChange) {
  const channel = supabase
    .channel("ngorder-kunjungan")
    .on("postgres_changes", { event: "*", schema: "public", table: "toko_kunjungan" }, (p) => onChange("kunjungan", p))
    .on("postgres_changes", { event: "*", schema: "public", table: "toko" }, (p) => onChange("toko", p))
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
