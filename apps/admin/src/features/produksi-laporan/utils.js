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

// Ringkasan kalkulasi dari batches + tagihan bulan terpilih.
export function calcRingkasan(batches, tagihan) {
  const totalBaju = batches.reduce((s, b) => s + (b.total_kain ?? 0), 0);
  const totalTagihan = tagihan.reduce((s, t) => s + (t.total_harga ?? 0), 0);
  const totalModal = batches.reduce((s, b) => s + (b.hpp_per_item || 0) * (b.total_kain || 0), 0);
  const hppBatches = batches.filter((b) => b.hpp_per_item > 0);
  const hppAvg =
    hppBatches.length > 0
      ? Math.round(hppBatches.reduce((s, b) => s + b.hpp_per_item, 0) / hppBatches.length)
      : 0;
  // Rata-rata harga jual sederhana dari batch yang punya harga_jual > 0.
  const hjBatches = batches.filter((b) => (b.harga_jual || 0) > 0);
  const hargaJualAvg =
    hjBatches.length > 0
      ? Math.round(
          hjBatches.reduce((s, b) => s + (b.harga_jual || 0), 0) / hjBatches.length,
        )
      : 0;
  return { totalBaju, totalTagihan, totalModal, hppAvg, hargaJualAvg };
}

// Agregasi pemakaian bahan lintas semua batch di bulan terpilih.
export function calcBahanUsage(batches) {
  const bahanUsage = {};
  for (const b of batches) {
    for (const bh of b.bahan_dipakai ?? []) {
      const key = `${bh.nama_bahan}||${bh.satuan}`;
      bahanUsage[key] = (bahanUsage[key] ?? 0) + (Number(bh.jumlah) || 0);
    }
  }
  return Object.entries(bahanUsage)
    .map(([key, jml]) => {
      const [nama, satuan] = key.split("||");
      return { nama, satuan, jumlah: jml };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}
