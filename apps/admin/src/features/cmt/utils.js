export function newSetoranFullItem() {
  return { size: "", warna: "", qty: "" };
}

export function newBahanItem() {
  return { nama_bahan: "", kode_bahan: "", satuan: "yard", jumlah: "" };
}

// Gabungkan kartu buku potongan (jahit_cards) yang dipilih utk dikirim ke
// CMT per kode+size+warna — beberapa kartu (misal dari 2 batch berbeda)
// bisa punya kombinasi kode+size+warna yang sama, qty-nya dijumlah jadi
// satu baris cmt_jahit_kirim, semua card id-nya ditautkan ke baris itu.
export function groupCardsByKodeSizeWarna(cards) {
  const order = [];
  const byKey = {};
  for (const c of cards ?? []) {
    const key = `${c.kode_produk}__${c.size}__${c.warna}`;
    if (!byKey[key]) {
      byKey[key] = {
        kode_produk: c.kode_produk,
        nama_produk: c.nama_produk,
        size: c.size,
        warna: c.warna,
        qty: 0,
        cardIds: [],
      };
      order.push(key);
    }
    byKey[key].qty += Number(c.qty) || 0;
    byKey[key].cardIds.push(c.id);
  }
  return order.map((k) => byKey[k]);
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

// Kelompokkan baris kirim CMT Jahit per kode produk utk tabel Surat Jalan
// (SuratJalanCmtModal) — satu kirim bisa berisi beberapa kode sekaligus.
export function groupRowsByKode(rows) {
  const order = [];
  const byKode = {};
  for (const r of rows ?? []) {
    if (!byKode[r.kode_produk]) {
      byKode[r.kode_produk] = {
        kode: r.kode_produk,
        namaProduk: r.nama_produk,
        rows: [],
        totalQty: 0,
      };
      order.push(r.kode_produk);
    }
    byKode[r.kode_produk].rows.push(r);
    byKode[r.kode_produk].totalQty += Number(r.qty) || 0;
  }
  return order.map((k) => byKode[k]);
}
