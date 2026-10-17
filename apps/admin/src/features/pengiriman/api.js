import { supabase } from "@deera/shared/lib/supabase";
import { displayName } from "@deera/shared/features/auth/api";
import { createPelanggan, findPelangganByNama, updatePelangganInfo } from "../pelanggan/api";

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

export function generatePengirimanNo() {
  const now = new Date();
  const d = now.toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `KRM-${d}-${rand}`;
}

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
