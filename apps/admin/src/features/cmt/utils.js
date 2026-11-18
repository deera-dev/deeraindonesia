export function newKirimItem() {
  return { kode_produk: "", nama_produk: "", size: "", warna: "", qty: "" };
}

export function newSetoranFullItem() {
  return { size: "", warna: "", qty: "" };
}

// Status satu baris kirim CMT Jahit: 'dikirim' (masih di vendor) ->
// 'setor' (sudah balik, menunggu diserap Finishing) -> 'selesai' (sudah
// nambah stok via rekonsiliasi Finishing) | 'batal'.
// Satu kirim_no bisa punya baris dengan status campuran (misal diserap
// Finishing satu-satu per kode) — urutan prioritas: masih ada yang
// 'dikirim' > masih ada yang 'setor' > semua 'selesai' > semua 'batal'.
export function kirimGroupStatus(rows) {
  if (!rows?.length) return "dikirim";
  if (rows.every((r) => r.status === "batal")) return "batal";
  if (rows.some((r) => r.status === "dikirim")) return "dikirim";
  if (rows.some((r) => r.status === "setor")) return "setor";
  return "selesai";
}

export function statusLabel(status) {
  if (status === "setor") return "Sudah Setor — Menunggu Finishing";
  if (status === "selesai") return "Selesai";
  if (status === "batal") return "Dibatalkan";
  return "Dikirim ke Vendor";
}

export function groupKirimByNo(rows) {
  const order = [];
  const byNo = {};
  for (const r of rows ?? []) {
    if (!byNo[r.kirim_no]) {
      byNo[r.kirim_no] = {
        kirimNo: r.kirim_no,
        namaVendor: r.nama_vendor,
        tanggalKirim: r.tanggal_kirim,
        estimasiSelesai: r.estimasi_selesai,
        tanggalSetor: r.tanggal_setor,
        hargaUpah: r.harga_upah,
        rows: [],
      };
      order.push(r.kirim_no);
    }
    byNo[r.kirim_no].rows.push(r);
  }
  return order.map((no) => {
    const g = byNo[no];
    return {
      ...g,
      status: kirimGroupStatus(g.rows),
      totalQtyKirim: g.rows.reduce((s, r) => s + (Number(r.qty) || 0), 0),
      totalQtySetor: g.rows.reduce((s, r) => s + (Number(r.qty_setor) || 0), 0),
    };
  });
}

export function calcTotalUpahSetoranFull(items, hargaUpah) {
  const totalQty = (items ?? []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  return totalQty * (Number(hargaUpah) || 0);
}
