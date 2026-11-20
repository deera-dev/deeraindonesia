import { supabase } from "@deera/shared/lib/supabase";

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
}) {
  const { data, error } = await supabase.rpc("create_pengiriman", {
    p_tanggal: tanggal,
    p_nama_penerima: namaPenerima,
    p_no_telp_penerima: noTelpPenerima ?? null,
    p_alamat: alamat ?? null,
    p_pelanggan_id: pelangganId ?? null,
    p_jumlah_karung: jumlahKarung,
    p_isi_karung: isiKarung ?? null,
    p_nama_ekspedisi: namaEkspedisi,
    p_nama_pengirim: namaPengirim,
  });
  if (error) throw new Error(error.message);
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

  const { data, error } = await supabase.rpc("update_pengiriman", {
    p_id: pengiriman.id,
    p_tanggal: tanggal,
    p_nama_penerima: namaPenerima,
    p_no_telp_penerima: noTelpPenerima ?? null,
    p_alamat: alamat ?? null,
    p_pelanggan_id: pelangganId ?? null,
    p_jumlah_karung: jumlahKarung,
    p_isi_karung: isiKarung ?? null,
    p_nama_ekspedisi: namaEkspedisi,
    p_nama_pengirim: namaPengirim,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePengiriman(pengiriman) {
  const { error } = await supabase.from("pengiriman").delete().eq("id", pengiriman.id);
  if (error) throw error;
}
