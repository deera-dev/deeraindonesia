export type StatusApproach = "belum" | "sudah";
export type Kesan = "tertarik" | "belum_tertarik";

export interface Toko {
  id: string;
  nama: string;
  alamat: string | null;
  kontak_nama: string | null;
  no_hp: string | null;
  catatan: string | null;
  daerah: string | null;
  media_sosial: string | null;
  status_approach: StatusApproach;
  kesan: Kesan | null;
  lat?: number | null;
  lng?: number | null;
  geocode_source?: string | null;
  geocoded_at?: string | null;
  skor?: number | null;
  prioritas?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTokoInput {
  nama: string;
  alamat?: string | null;
  kontak_nama?: string | null;
  no_hp?: string | null;
  catatan?: string | null;
  daerah?: string | null;
  media_sosial?: string | null;
  status_approach?: StatusApproach;
  kesan?: Kesan | null;
}

export type TokoPatch = Partial<CreateTokoInput>;

export type ItemStatus = "dipilih" | "tidak_dipilih" | "pending";

export interface SampelKirimanItem {
  id: string;
  toko_id: string;
  kode: string;
  nama: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at?: string;
  sampel_kiriman?: { tanggal: string; catatan: string | null } | null;
}

export interface CreateKirimanItem {
  kode: string;
  nama?: string | null;
}

export interface CreateKirimanInput {
  tokoId: string;
  tanggal?: string;
  catatan?: string | null;
  items: CreateKirimanItem[];
}

export type KunjunganStatus = "rencana" | "berlangsung" | "selesai" | "batal";

export interface TokoKunjungan {
  id: string;
  toko_id: string;
  status: KunjunganStatus;
  aktif: boolean;
  hasil: string | null;
  request: string | null;
  kesan: Kesan | null;
  dipilih_oleh_email?: string | null;
  dipilih_oleh_nama?: string | null;
  diubah_oleh_email?: string | null;
  diubah_oleh_nama?: string | null;
  mulai_at?: string | null;
  selesai_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export type KunjunganPatch = Partial<Pick<TokoKunjungan, "status" | "hasil" | "request" | "kesan">>;

export interface Actor {
  email: string | null;
  name: string | null;
}

export interface GeocodeLocation {
  lat: number;
  lng: number;
}

export interface ProductLike {
  kode: string;
  nama?: string | null;
}

export interface JarakInfo {
  distanceKm: number;
  durationMin?: number | null;
}
