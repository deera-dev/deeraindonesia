export type TripStatus = "rencana" | "berjalan" | "selesai" | "batal";

export interface TripToko {
  toko_id: string;
  nama: string;
  daerah: string;
  dikunjungi: boolean;
  link: string;
}

export interface TripSampel {
  kode: string;
  nama: string;
  qty: number;
  terbagi: number;
}

export interface TripBiaya {
  id: string;
  tanggal: string;
  kategori: string;
  jumlah: number;
  catatan: string;
}

export interface Trip {
  id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  daerah: string[];
  peserta: string[];
  modal_awal: number;
  status: TripStatus;
  sampel: TripSampel[];
  toko: TripToko[];
  biaya: TripBiaya[];
  catatan: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTripInput {
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  daerah?: string[];
  peserta?: string[];
  modal_awal?: number;
  status?: TripStatus;
  sampel?: TripSampel[];
  toko?: TripToko[];
  biaya?: TripBiaya[];
  catatan?: string | null;
}

export type UpdateTripPatch = Partial<CreateTripInput>;

export interface TripOpenRow {
  toko_id: string;
  first_opened_at: string;
  opens: number;
  produk: string[];
}

export interface TokoLike {
  id: string;
  nama: string;
  daerah?: string | null;
  skor?: number | null;
  prioritas?: string | null;
  no_hp?: string | null;
  media_sosial?: unknown;
}
