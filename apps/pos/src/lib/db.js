// Local-first database menggunakan Dexie (IndexedDB wrapper)
import Dexie from "dexie";

export const db = new Dexie("deera_pos");

db.version(1).stores({
  products:   "kode, nama, created_at",
  sales:      "++id, status, created_at, date",
});

db.version(2).stores({
  products:   "kode, nama, created_at",
  sales:      "++id, status, created_at, date",
  stok_warna: "[kode+size+warna], kode",
});

db.version(3).stores({
  products:   "kode, nama, created_at",
  sales:      "++id, status, created_at, date",
  stok_warna: "[kode+size+warna], kode",
  pelanggan:  "id, nama, no_hp, updated_at",   // cache pelanggan dari Supabase
});

// status sales : 'pending' | 'synced' | 'error'
// type sales   : 'sale'    | 'retur'
