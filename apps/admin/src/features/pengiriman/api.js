/**
 * features/pengiriman/api.js
 * Panggilan Supabase MENTAH untuk fitur "Pengiriman" — kategori baru di
 * halaman Transfer, terpisah dari "Transfer Stok" (../transfer). Pengiriman
 * TIDAK menyentuh stok/produk sama sekali — ini murni alat bantu bikin surat
 * jalan (gambar, ukuran struk 78/100mm) untuk pengiriman barang ke ekspedisi
 * (JNE/JNT/dll), plus riwayat pengiriman yang tersimpan di database.
 *
 * Table Supabase: pengiriman
 *   id, pengiriman_no, tanggal, nama_penerima, no_telp_penerima, alamat,
 *   pelanggan_id, jumlah_karung, isi_karung, nama_ekspedisi, nama_pengirim,
 *   created_by, created_by_name, created_at
 *
 * Pure async functions, TIDAK ADA React di sini — komponen HANYA boleh akses
 * lewat hooks.js (lihat CLAUDE.md §4/§7 Dependency Inversion).
 *
 * Daftar penerima (permintaan Denny 2026-08: "ada daftar pelanggan ... bisa
 * langsung dipilih") REUSE tabel `pelanggan` yang sudah dipakai POS, BUKAN
 * tabel terpisah — lihat migration `add_ekspedisi_biasa_and_pengiriman_pelanggan_link`
 * (kolom `pelanggan.ekspedisi_biasa`, `pengiriman.pelanggan_id`, `pengiriman.alamat`).
 * `resolvePelangganLink()` di bawah ini adalah satu-satunya tempat yang
 * berkomunikasi dengan `features/pelanggan/api.js` (komposisi api.js↔api.js
 * lintas-fitur di layer yang sama, sah menurut CLAUDE.md §4/§7).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { displayName } from "@deera/shared/features/auth/api";
import { createPelanggan, findPelangganByNama, updatePelangganInfo } from "../pelanggan/api";

// Resolve `pelanggan_id` utk satu pengiriman + auto-save/auto-refresh data
// pelanggan terkait (no_hp/alamat/ekspedisi_biasa) — dipanggil dari
// createPengiriman & updatePengiriman.
//
// Urutan resolusi:
//   1. Kalau `pelangganId` sudah ada (dipilih dari autocomplete) → update
//      record itu dgn data terbaru, pakai id yg sama.
//   2. Kalau tidak, cari pelanggan dgn nama SAMA PERSIS (case-insensitive) —
//      kalau ketemu (mis. penerima diketik manual tapi kebetulan sudah
//      pernah terdaftar), link ke situ + update datanya.
//   3. Kalau masih tidak ketemu, buat pelanggan baru.
//
// SENGAJA tidak pernah melempar error ke pemanggil — gagal auto-link/auto-
// save pelanggan TIDAK BOLEH menggagalkan pembuatan/update pengiriman itu
// sendiri, sama seperti pola resolve pelanggan_id di checkout POS
// (apps/pos/src/features/kasir/hooks.js useCheckout()).
async function resolvePelangganLink({ pelangganId, namaPenerima, noTelpPenerima, alamat, namaEkspedisi }) {
  const patch = { no_hp: noTelpPenerima, alamat, ekspedisi_biasa: namaEkspedisi };
  try {
    if (pelangganId) {
      await updatePelangganInfo(pelangganId, patch);
      return pelangganId;
    }
    const existing = await findPelangganByNama(namaPenerima);
    if (existing) {
      await updatePelangganInfo(existing.id, patch);
      return existing.id;
    }
    const created = await createPelanggan({ nama: namaPenerima, ...patch });
    return created.id;
  } catch (err) {
    console.warn("[Pengiriman] Gagal auto-link/auto-save pelanggan:", err.message);
    return pelangganId ?? null;
  }
}

// ── Generate nomor surat jalan pengiriman ────────────────────────────────────
// Prefix "KRM" (kirim) — SENGAJA beda dari "SJ" yang dipakai transfer stok
// (../../../../packages/shared/features/transfers/api.js) supaya kedua jenis
// surat jalan tidak tertukar walau formatnya mirip.
export function generatePengirimanNo() {
  const now = new Date();
  const d = now.toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `KRM-${d}-${rand}`;
}

// dateFrom/dateTo: "YYYY-MM-DD" | null (inklusif, filter berdasar `tanggal`)
export async function fetchPengiriman(dateFrom = null, dateTo = null) {
  let q = supabase.from("pengiriman").select("*").order("created_at", { ascending: false });

  if (dateFrom) q = q.gte("tanggal", dateFrom);
  if (dateTo) q = q.lte("tanggal", dateTo);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createPengiriman({
  tanggal,
  namaPenerima,
  noTelpPenerima,
  alamat,
  pelangganId,
  jumlahKarung,
  isiKarung,
  namaEkspedisi,
  namaPengirim,
  user,
}) {
  if (!tanggal) throw new Error("Tanggal wajib diisi.");
  if (!namaPenerima?.trim()) throw new Error("Nama penerima wajib diisi.");
  if (!jumlahKarung || jumlahKarung <= 0) throw new Error("Jumlah karung harus lebih dari 0.");
  if (!namaEkspedisi?.trim()) throw new Error("Nama ekspedisi wajib diisi.");
  if (!namaPengirim?.trim()) throw new Error("Nama pengirim wajib diisi.");

  const resolvedPelangganId = await resolvePelangganLink({
    pelangganId,
    namaPenerima: namaPenerima.trim(),
    noTelpPenerima,
    alamat,
    namaEkspedisi: namaEkspedisi.trim(),
  });

  const payload = {
    pengiriman_no: generatePengirimanNo(),
    tanggal,
    nama_penerima: namaPenerima.trim(),
    no_telp_penerima: noTelpPenerima?.trim() || null,
    alamat: alamat?.trim() || null,
    pelanggan_id: resolvedPelangganId,
    jumlah_karung: jumlahKarung,
    isi_karung: isiKarung?.trim() || null,
    nama_ekspedisi: namaEkspedisi.trim(),
    nama_pengirim: namaPengirim.trim(),
    created_by: user?.email ?? null,
    created_by_name: displayName(user),
  };

  const { data, error } = await supabase.from("pengiriman").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePengiriman(pengiriman, payload) {
  const {
    tanggal,
    namaPenerima,
    noTelpPenerima,
    alamat,
    pelangganId,
    jumlahKarung,
    isiKarung,
    namaEkspedisi,
    namaPengirim,
  } = payload;

  if (!tanggal) throw new Error("Tanggal wajib diisi.");
  if (!namaPenerima?.trim()) throw new Error("Nama penerima wajib diisi.");
  if (!jumlahKarung || jumlahKarung <= 0) throw new Error("Jumlah karung harus lebih dari 0.");
  if (!namaEkspedisi?.trim()) throw new Error("Nama ekspedisi wajib diisi.");
  if (!namaPengirim?.trim()) throw new Error("Nama pengirim wajib diisi.");

  const resolvedPelangganId = await resolvePelangganLink({
    pelangganId,
    namaPenerima: namaPenerima.trim(),
    noTelpPenerima,
    alamat,
    namaEkspedisi: namaEkspedisi.trim(),
  });

  const { error } = await supabase
    .from("pengiriman")
    .update({
      tanggal,
      nama_penerima: namaPenerima.trim(),
      no_telp_penerima: noTelpPenerima?.trim() || null,
      alamat: alamat?.trim() || null,
      pelanggan_id: resolvedPelangganId,
      jumlah_karung: jumlahKarung,
      isi_karung: isiKarung?.trim() || null,
      nama_ekspedisi: namaEkspedisi.trim(),
      nama_pengirim: namaPengirim.trim(),
    })
    .eq("id", pengiriman.id);

  if (error) throw error;
}

export async function deletePengiriman(pengiriman) {
  const { error } = await supabase.from("pengiriman").delete().eq("id", pengiriman.id);
  if (error) throw error;
}
