// ============================================================
// Info toko Deera — tampil di struk pembelian
// Edit file ini sesuai data toko yang benar
// ============================================================

export const STORE_INFO = {
  nama: "Deera Indonesia",
  tagline: "Graceful Elegance",
  website: "deera.id",

  // Nomor WhatsApp (format internasional tanpa +)
  wa: "+62811947254", // ← ganti dengan nomor WA Deera

  // Rekening bank — bisa lebih dari satu
  rekening: [
    {
      bank: "BCA",
      no: "2060425542",
      atas_nama: "Siti Asiyah",
    },
    {
      bank: "BCA",
      no: "7145047978",
      atas_nama: "Wulan Nur Oktafiani",
    },
    // Tambahkan rekening lain jika perlu:
    // { bank: "BRI", no: "XXXX XXXX XXXX", atas_nama: "..." },
  ],
};
