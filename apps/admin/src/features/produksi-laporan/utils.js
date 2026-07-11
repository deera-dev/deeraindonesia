/**
 * features/produksi-laporan/utils.js
 * Pure helpers — tidak ada I/O.
 */
export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// Singkat angka besar agar tidak overflow di StatCard sempit.
// ≥ 1 M → "Rp 1,4 M"  |  ≥ 1 jt → "Rp 145,6 jt"  |  lainnya → fmtRp
export function fmtRpShort(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  return fmtRp(v);
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function monthLabel(yyyy, mm) {
  return new Date(yyyy, mm - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

// Rentang -11..+2 bulan dari sekarang, untuk dropdown pemilih bulan.
export function buildMonthOptions() {
  const now = new Date();
  const options = [];
  for (let i = -11; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    options.push({ value: `${yyyy}-${mm}`, label: monthLabel(yyyy, d.getMonth() + 1) });
  }
  return options;
}

// Konversi "YYYY-MM" terpilih → { yyyy, mm, fromDate, toDate }.
export function getMonthRange(selectedMonth) {
  const [yyyy, mm] = selectedMonth.split("-").map(Number);
  const fromDate = `${selectedMonth}-01`;
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const toDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
  return { yyyy, mm, fromDate, toDate };
}

// Total tagihan jatuh tempo bulan terpilih. SATU-SATUNYA business math yang
// masih tersisa di frontend untuk fitur laporan produksi — sengaja TIDAK
// dipindahkan ke RPC `get_laporan_produksi` karena `tagihan` berasal dari
// fungsi/tabel yang sepenuhnya terpisah (fetchTagihanJatuhTempo →
// bahan_pembelian/bahan_pinjam, difilter oleh jatuh_tempo, BUKAN
// tanggal_produksi) — di luar scope tabel yang dibaca RPC tersebut
// (produksi_batch/hpp_template/products). Lihat catatan "BATAS SCOPE" di
// header migration SQL untuk penjelasan lengkap.
export function calcTotalTagihan(tagihan) {
  return tagihan.reduce((s, t) => s + (t.total_harga ?? 0), 0);
}
