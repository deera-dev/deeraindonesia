export interface StokWarnaRow {
  kode: string;
  size: string;
  warna: string;
  gudang: number;
  cideng: number;
  tegalgubug: number;
}

export interface ExpectedStokRow {
  kode: string;
  size: string;
  warna: string;
  expected_qty: number;
}

export type NestedVariantMap = Record<string, Record<string, Record<string, number>>>;

export interface BukuPotonganData {
  stokRows: StokWarnaRow[];
  expectedRows: ExpectedStokRow[];
  soldMap: NestedVariantMap;
  dikirimMap: NestedVariantMap;
  tableError: boolean;
}
