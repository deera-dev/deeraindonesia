import { supabase } from "@deera/shared/lib/supabase";
import { markTokoVisitedInActiveTrips } from "../ngorder-jadwal/api";

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
  const { data, error } = await supabase
    .from("toko")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
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

// Dulu insert sampel_kiriman lalu insert bulk sampel_kiriman_item — 2
// tabel tanpa transaction, bisa nyisain kiriman "hantu" (0 item) kalau
// step kedua gagal. Sekarang 1 RPC atomik, identitas dari auth.uid() —
// lihat supabase/migrations/20261120_ngorder_crud.sql.
export async function createKiriman({ tokoId, tanggal, catatan, items }) {
  if (!tokoId) throw new Error("Toko wajib dipilih.");
  if (!items?.length) throw new Error("Pilih minimal satu produk untuk dikirim.");

  const { data, error } = await supabase.rpc("create_kiriman", {
    p_toko_id: tokoId,
    p_tanggal: tanggal || new Date().toISOString().slice(0, 10),
    p_catatan: catatan?.trim() || null,
    p_items: items.map((it) => ({ kode: it.kode, nama: it.nama ?? null })),
  });
  if (error) throw new Error(error.message);

  return data;
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

// Dulu select dedup + loop insert satu-satu dgn try/catch per-row utk
// unique violation (toko_kunjungan_aktif_uniq) — sekarang 1 RPC, bulk
// insert dgn ON CONFLICT (toko_id) WHERE aktif DO NOTHING, sekalian
// atomik. dipilih_oleh_email/nama dari auth.uid(), bukan objek `user`
// client — lihat supabase/migrations/20261120_ngorder_crud.sql.
export async function addRencana({ tokoIds }) {
  const ids = [...new Set(tokoIds ?? [])].filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase.rpc("add_rencana_kunjungan", { p_toko_ids: ids });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Delete batch + update batch sekarang 1 RPC atomik.
export async function removeRencana(rows) {
  const list = (rows ?? []).filter(Boolean);
  const blank = list.filter(isBlankKunjungan).map((r) => r.id);
  const keep = list.filter((r) => !isBlankKunjungan(r)).map((r) => r.id);
  if (!blank.length && !keep.length) return;
  const { error } = await supabase.rpc("remove_rencana_kunjungan", {
    p_blank_ids: blank,
    p_keep_ids: keep,
  });
  if (error) throw new Error(error.message);
}

// Dulu update toko_kunjungan lalu (kalau status jadi selesai) update
// toko TANPA try/catch — kalau step kedua gagal, seluruh function throw
// padahal step pertama sudah ter-commit (kunjungan selesai tapi
// toko.status_approach belum ikut). Sekarang 1 RPC atomik, identitas
// dari auth.uid().
export async function updateKunjungan({ row, patch }) {
  if (!row?.id) throw new Error("Kunjungan tidak ditemukan.");
  const { data, error } = await supabase.rpc("update_kunjungan", {
    p_id: row.id,
    p_patch: patch,
  });
  if (error) throw new Error(error.message);
  if (data.status === "selesai") {
    // Best-effort — jangan gagalkan update kunjungan cuma karena sinkron
    // checklist trip-nya gagal.
    markTokoVisitedInActiveTrips(data.toko_id).catch((err) =>
      console.warn("markTokoVisitedInActiveTrips error:", err),
    );
  }
  return data;
}

// Sinkronisasi dgn checklist trip (fitur ngorder-jadwal) — begitu toko
// dicentang "dikunjungi" di checklist, tercatat juga sbg kunjungan selesai
// di sini (tanpa hasil/kesan — itu bisa diisi belakangan lewat tab Peta).
// Kalau toko ini sudah pernah ditandai selesai, gak diapa-apain lagi.
// Dipanggil dari ngorder-jadwal/api.js saat toggle checklist.
//
// Jalur insert-baru (toko belum pernah ada kunjungan aktif) dulu insert
// toko_kunjungan lalu update toko sbg 2 langkah tanpa transaction —
// sekarang RPC terpisah (create_kunjungan_selesai) yg disatukan.
export async function markTokoVisitedViaTrip(tokoId) {
  if (!tokoId) return null;
  const { data: existing, error: fetchErr } = await supabase
    .from("toko_kunjungan")
    .select("*")
    .eq("toko_id", tokoId)
    .eq("aktif", true)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (existing) {
    if (existing.status === "selesai") return existing;
    return updateKunjungan({ row: existing, patch: { status: "selesai" } });
  }

  const { data, error } = await supabase.rpc("create_kunjungan_selesai", {
    p_toko_id: tokoId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function markGeocodeFailed(id) {
  const { error } = await supabase
    .from("toko")
    .update({ geocode_source: "gagal", geocoded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function resolveGoogleMapsLink(url) {
  const res = await fetch("/api/resolve-maps-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Gagal membaca link Google Maps.");
  return data;
}

export function subscribeNgorder(onChange) {
  const channel = supabase
    .channel("ngorder-kunjungan")
    .on("postgres_changes", { event: "*", schema: "public", table: "toko_kunjungan" }, (p) =>
      onChange("kunjungan", p),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "toko" }, (p) =>
      onChange("toko", p),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
