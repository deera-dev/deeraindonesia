/**
 * features/ngorder/api.js
 * Panggilan Supabase MENTAH untuk fitur Distribusi Sampel ke Toko
 * (permintaan Denny 2026-10: tim sales sering ngorder bawa sampel ke
 * toko/mitra seperti UD Putra Toserba, Hara Boutique, dst — sebelumnya
 * cuma UD Putra Toserba yang tercatat lengkap secara manual, lihat
 * migrasi supabase/migrations/20261003_sampel_toko_distribusi.sql).
 *
 * `kode` di sampel_kiriman_item SENGAJA teks bebas (bukan FK ke
 * products.kode) — data historis (hasil impor laporan manual) kadang tidak
 * persis sama formatnya dgn kode aktif di katalog (spasi vs strip, dst),
 * dan produk bisa saja sudah didiscontinue tapi riwayatnya tetap perlu
 * tersimpan apa adanya.
 */
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
    // status_approach default "belum" (permintaan Denny 2026-10: toko
    // potensial yang baru dicatat saat scouting lokasi BELUM tentu sudah
    // di-approach) — "sudah" hanya kalau eksplisit diisi lewat form.
    status_approach: status_approach === "sudah" ? "sudah" : "belum",
    // kesan cuma relevan kalau sudah di-approach — dipaksa null kalau belum,
    // supaya tidak ada toko "belum di-approach" yang kebetulan punya kesan.
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
    // Balik ke "belum" (mis. ternyata belum pernah dikunjungi, salah input
    // sebelumnya) -> kesan ikut dikosongkan, konsisten dgn createToko.
    if (payload.status_approach === "belum") payload.kesan = null;
  }
  if ("kesan" in patch && !("status_approach" in patch)) payload.kesan = patch.kesan || null;
  const { data, error } = await supabase.from("toko").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteToko(id) {
  if (!id) throw new Error("id toko wajib diisi.");
  // Cascade: sampel_kiriman + sampel_kiriman_item milik toko ini ikut
  // terhapus otomatis (FK on delete cascade, lihat migrasi).
  const { error } = await supabase.from("toko").delete().eq("id", id);
  if (error) throw error;
}

// Seluruh item sampel yang PERNAH dikirim ke satu toko, terurut dari yang
// paling lama dikirim — pemanggil (utils.js summarizeTokoItems) yang
// menentukan status TERKINI per kode (kalau kode yang sama dikirim lagi di
// kiriman berikutnya, baris yang lebih baru itu yang dianggap berlaku).
export async function fetchTokoItems(tokoId) {
  const { data, error } = await supabase
    .from("sampel_kiriman_item")
    .select("*, sampel_kiriman(tanggal, catatan)")
    .eq("toko_id", tokoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * createKiriman — catat satu kali kirim sampel (satu kunjungan) ke toko,
 * berisi beberapa kode sekaligus. Semua item mulai dari status "pending"
 * (menunggu keputusan toko) — diupdate belakangan via updateItemStatus
 * saat tim sales kunjungan lagi dan dapat kabar mana yang diambil/tidak.
 */
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

// ── Lokasi peta (lat/lng) ──────────────────────────────────────────────────
// Dipanggil HANYA lewat aksi explicit admin (tombol "Cari Titik Lokasi" di
// PetaTab, hasil geocoding Google) atau drag pin manual di peta — TIDAK
// PERNAH otomatis dari createToko/updateToko, supaya tidak memicu request
// geocoding setiap kali form toko disimpan (lihat lib/geocode.js).
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
