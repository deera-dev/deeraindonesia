export interface CalonCustomer {
  id: string;
  nama: string;
  no_hp: string | null;
  catatan: string | null;
  updated_at: string;
}

export interface CalonCustomerPatch {
  nama?: string;
  no_hp?: string | null;
  catatan?: string | null;
}
