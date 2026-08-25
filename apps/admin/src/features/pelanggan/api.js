/**
 * features/pelanggan/api.js
 * Panggilan Supabase MENTAH untuk fitur riwayat pembelian pelanggan (Admin).
 * Pure async, tidak ada React.
 *
 * Beda dari apps/pos/src/features/pelanggan (yang offline-first via Dexie
 * utk kasir) — Admin ONLINE-ONLY, jadi langsung query Supabase tanpa cache
 * lokal, sama seperti pola features/produk/api.js.
 */
import { supabase } from "@deera/shared/lib/supabase";

// Daftar seluruh pelanggan terdaftar, diurutkan nama A-Z.
export async function fetchPelangganList() {
  const { data, error } = await supabase.from("pelanggan").select("*").order("nama");
  if (error) throw error;
  return data ?? [];
}

// Riwayat transaksi (sale & retur) milik satu pelanggan, terbaru dulu.
// HANYA mencakup sales yang punya pelanggan_id ter-link ke record ini —
// transaksi lama dengan buyer_name cocok tapi TANPA pelanggan_id (dibuat
// sebelum pelanggan didaftarkan / kasir tidak memilih dari daftar) TIDAK
// ikut kehitung, konsisten dengan cara `sales.pelanggan_id` diisi di
// apps/pos/src/features/penjualan/hooks.js.
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

// ── Ditambahkan untuk fitur Pengiriman (permintaan Denny 2026-08): daftar
// penerima pengiriman reuse tabel `pelanggan` yang sama dipakai POS, BUKAN
// tabel terpisah. Fungsi di bawah ini dipanggil dari dua tempat:
//   - `searchPelanggan` diekspos lewat hooks.js/index.js → dipakai komponen
//     `PengirimanForm` untuk autocomplete-as-you-type.
//   - `createPelanggan`/`updatePelangganInfo`/`findPelangganByNama` HANYA
//     dipanggil dari `features/pengiriman/api.js` (komposisi api.js↔api.js
//     lintas-fitur di layer yang sama, sah menurut CLAUDE.md §4/§7) untuk
//     auto-save/auto-link penerima ke daftar pelanggan — TIDAK diekspos ke
//     komponen manapun.

// Cari pelanggan by nama ATAU no_hp (ilike, max 8 hasil) — dipakai
// autocomplete. Admin online-only, jadi query langsung ke Supabase (beda
// dari `searchPelanggan` versi POS yang filter Dexie lokal).
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

// Cari SATU pelanggan dengan nama sama persis (case-insensitive) — dipakai
// utk auto-link penerima pengiriman yang namanya diketik manual (tanpa
// pilih dari dropdown autocomplete) tapi kebetulan sudah pernah terdaftar.
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

// Update ringan data pelanggan (dipanggil saat auto-save dari Pengiriman) —
// HANYA menimpa field yang benar-benar diisi (truthy) di `patch`, supaya
// mengedit satu pengiriman tidak diam-diam mengosongkan alamat/no_hp
// pelanggan yang sudah tersimpan sebelumnya kalau field itu dikosongkan
// sementara di form pengiriman.
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
