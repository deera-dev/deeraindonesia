export interface Pengiriman {
  id: string;
  pengiriman_no: string;
  tanggal: string;
  nama_penerima: string;
  no_telp_penerima: string | null;
  alamat: string | null;
  pelanggan_id: string | null;
  jumlah_karung: number;
  isi_karung: string | null;
  nama_ekspedisi: string;
  nama_pengirim: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface PengirimanFormPayload {
  tanggal: string;
  namaPenerima: string;
  noTelpPenerima?: string | null;
  alamat?: string | null;
  pelangganId?: string | null;
  jumlahKarung: number;
  isiKarung?: string | null;
  namaEkspedisi: string;
  namaPengirim: string;
}

export interface PelangganLike {
  nama?: string | null;
  no_hp?: string | null;
  alamat?: string | null;
  ekspedisi_biasa?: string | null;
}
