export interface RestockItem {
  kode: string;
  size: string;
  warna: string;
  butuh?: number;
  gudangQty?: number;
  [key: string]: unknown;
}

export interface PasarRestockData {
  restock: RestockItem[];
  tidak_bergerak: RestockItem[];
}
