export interface LabelRow {
  size: string;
  produced: number;
  qty: number;
}

export interface LabelItem {
  kode: string;
  size: string;
  qty: number;
}

export interface PrintProgress {
  stage: "connect" | "send";
  pct: number;
}
