/**
 * features/pengiriman/utils.js — pure helpers, tidak ada React/Supabase.
 */

// Format tanggal "24 Agustus 2026" — dipakai di kartu list & surat jalan.
export function fmtDate(isoDate) {
  if (!isoDate) return "-";
  // isoDate dari <input type="date"> / kolom `date` Supabase = "YYYY-MM-DD"
  // (tanpa waktu) — parse manual (bukan `new Date(isoDate)`) supaya TIDAK
  // kena pergeseran timezone (lihat CLAUDE.md §13 "Jangan gunakan
  // toISOString() untuk tanggal lokal").
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "-";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Lebar kertas surat jalan pengiriman — permintaan Denny 2026-08 "ukurannya
// sama seperti struk versi A, bisa 78 dan 100" (meniru toggle lebar kertas
// 78mm/100mm di POS, TAPI ini gambar biasa/"Versi A"-style, BUKAN cetak
// thermal TSPL — jadi tidak perlu 203dpi seperti apps/pos/useTsplPrinter.js).
// Konversi mm→px pakai standar CSS 96dpi (1in = 25.4mm = 96px) supaya kalau
// PNG-nya dicetak ulang di printer biasa pada ukuran fisik yg sama, proporsi
// tetap akurat.
export const PAPER_WIDTHS_MM = {
  78: { label: "78mm" },
  100: { label: "100mm" },
};

const CSS_PX_PER_MM = 96 / 25.4;

export function mmToPx(mm) {
  return Math.round(Number(mm) * CSS_PX_PER_MM);
}

// "Daftar Penerima" (permintaan Denny 2026-08 "button baru ... isinya HANYA
// pelanggan yang datanya sudah lengkap, nama penerimanya, no telfonnya,
// alamatnya, dan ekspedisi yang terakhir dipakai") — pelanggan dianggap
// "lengkap" kalau nama + no_hp + alamat + ekspedisi_biasa SEMUA terisi.
// `ekspedisi_biasa` otomatis ke-update ke ekspedisi TERAKHIR dipakai setiap
// kali pengiriman dibuat/diedit dgn pelanggan itu (lihat resolvePelangganLink
// di ../pengiriman/api.js → updatePelangganInfo di ../pelanggan/api.js),
// jadi field ini SUDAH persis "ekspedisi yang terakhir dipakai".
export function isPenerimaLengkap(pelanggan) {
  return !!(
    pelanggan?.nama?.trim() &&
    pelanggan?.no_hp?.trim() &&
    pelanggan?.alamat?.trim() &&
    pelanggan?.ekspedisi_biasa?.trim()
  );
}
