// Agregasi qty yang sedang di-Keep (dipesan tapi belum dibayar, format
// item sama dgn sales.items — lihat CLAUDE.md §6 "keep_orders") — dipakai
// utk badge "N di-Keep" di tim gudang (admin, ProductCard/ProductDetailModal)
// & tim pasar (pos, WarnaPanel saat kasir pilih warna utk dijual).
//
// SENGAJA tidak mengurangi stok yang ditampilkan (Keep bukan penjualan,
// stok_warna tidak disentuh sampai dibayar) — badge ini CUMA info
// tambahan supaya tim tau sebagian stok yang keliatan sudah "terpakai",
// keputusan jual/tidak tetap di tangan tim.
function itemQty(item) {
  if (Array.isArray(item?.warna)) {
    return item.warna.reduce((s, w) => s + (Number(w?.qty) || 0), 0);
  }
  return Number(item?.qty) || 0;
}

export function aggregateKeepQtyByKode(items) {
  const map = {};
  for (const item of items ?? []) {
    if (!item?.kode) continue;
    map[item.kode] = (map[item.kode] ?? 0) + itemQty(item);
  }
  return map;
}

// Lebih rinci: per kode -> size -> warna, utk breakdown per-warna (mis.
// WarnaPanel kasir POS, atau "Stok per Warna" di ProductDetailModal admin).
export function aggregateKeepQtyByKodeSizeWarna(items) {
  const map = {};
  for (const item of items ?? []) {
    if (!item?.kode || !item?.size || !Array.isArray(item.warna)) continue;
    for (const w of item.warna) {
      const warna = w?.nama;
      const qty = Number(w?.qty) || 0;
      if (!warna || qty <= 0) continue;
      map[item.kode] ??= {};
      map[item.kode][item.size] ??= {};
      map[item.kode][item.size][warna] = (map[item.kode][item.size][warna] ?? 0) + qty;
    }
  }
  return map;
}
