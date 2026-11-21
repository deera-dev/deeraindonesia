export interface Pelanggan {
  id: string;
  nama: string;
  no_hp: string | null;
  alamat: string | null;
  ekspedisi_biasa: string | null;
  lat?: number | null;
  lng?: number | null;
  geocode_source?: string | null;
  geocoded_at?: string | null;
  updated_at: string;
}

export interface SaleWarnaItem {
  nama?: string;
  qty: number;
}

export interface SaleItem {
  kode: string;
  size?: string | null;
  harga: number;
  hpp: number;
  qty?: number;
  warna?: SaleWarnaItem[];
}

export interface Sale {
  id: string;
  date: string;
  created_at: string;
  type: string;
  location: string;
  items: SaleItem[];
  discount: number;
  total: number;
  buyer_name: string | null;
  buyer_hp: string | null;
  created_by_name: string | null;
}
