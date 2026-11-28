export interface RestockDetail {
  size: string;
  warna: string;
  butuh: number;
  gudangQty: number;
  marketQty: number;
  otherMarket?: string | null;
  otherQty?: number;
  menipis: boolean;
  hampirHabis: boolean;
  total: number;
}

export interface RestockCard {
  kode: string;
  details: RestockDetail[];
}

export interface PasarRestockData {
  restock: RestockCard[];
  tidak_bergerak: RestockCard[];
}
