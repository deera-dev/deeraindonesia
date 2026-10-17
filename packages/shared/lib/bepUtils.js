import { getMarketLocation, LOCATIONS } from "./marketDay";

const MARKET_LOCATIONS = LOCATIONS.filter((l) => l !== "gudang");

export const DEFAULT_BIAYA_PASAR = {
  cideng: { transport_per_trip: 180000, sewa_lapak_per_tahun: 50000000 },
  tegalgubug: { transport_per_trip: 1250000, sewa_lapak_per_tahun: 27000000 },
};

function effQty(item) {
  if (Array.isArray(item.warna) && item.warna.length > 0) {
    return item.warna.reduce((s, w) => s + (w.qty ?? 0), 0);
  }
  return item.qty ?? 0;
}

function itemProfit(item) {
  return ((item.harga ?? 0) - (item.hpp ?? 0)) * effQty(item);
}

export function localDateStr(d = new Date()) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function getHariBukaPerMinggu(lokasi) {
  let count = 0;
  const base = new Date(2024, 0, 1);
  for (let i = 0; i < 7; i++) {
    const test = new Date(base);
    test.setDate(base.getDate() + i);
    if (getMarketLocation(test) === lokasi) count++;
  }
  return count;
}

export function getHppPasarPerHari(biayaRow, lokasi) {
  if (!biayaRow) return 0;
  const hariBukaPerTahun = getHariBukaPerMinggu(lokasi) * 52;
  const sewaPerHari = hariBukaPerTahun > 0 ? (biayaRow.sewa_lapak_per_tahun ?? 0) / hariBukaPerTahun : 0;
  return (biayaRow.transport_per_trip ?? 0) + sewaPerHari;
}

export function getHppPasarPerPeriode(biayaRow, lokasi) {
  const perHari = getHppPasarPerHari(biayaRow, lokasi);
  const hariBukaPerMinggu = getHariBukaPerMinggu(lokasi);
  return {
    perHari,
    perMinggu: perHari * hariBukaPerMinggu,
    perBulan: perHari * hariBukaPerMinggu * 4.333,
    perTahun: perHari * hariBukaPerMinggu * 52,
    hariBukaPerMinggu,
  };
}

export function computeMarginPerPcs(salesRows, { windowDays = 60, today = new Date() } = {}) {
  let rows = salesRows;
  if (windowDays) {
    const since = localDateStr(new Date(today.getTime() - windowDays * 86400000));
    rows = salesRows.filter((s) => (s.date ?? "") >= since);
  }
  let totalMargin = 0,
    totalPcs = 0,
    totalOmzet = 0;
  for (const s of rows) {
    const sign = s.type === "retur" ? -1 : 1;
    for (const item of s.items ?? []) {
      const q = effQty(item);
      totalMargin += sign * itemProfit(item);
      totalPcs += sign * q;
      totalOmzet += sign * (item.harga ?? 0) * q;
    }
  }
  if (totalPcs <= 0) {
    if (windowDays) return computeMarginPerPcs(salesRows, { windowDays: 0, today });
    return { marginPerPcs: 0, hargaJualRataRata: 0, totalPcs: 0 };
  }
  return {
    marginPerPcs: totalMargin / totalPcs,
    hargaJualRataRata: totalOmzet / totalPcs,
    totalPcs,
  };
}

export function computeBepLokasi(biayaRow, lokasi, marginPerPcs, hargaJualRataRata) {
  const hppPasar = getHppPasarPerPeriode(biayaRow, lokasi);
  if (!marginPerPcs || marginPerPcs <= 0) {
    return {
      pcsPerHari: 0,
      pcsPerMinggu: 0,
      pcsPerBulan: 0,
      pcsPerTahun: 0,
      omzetPerHari: 0,
      omzetPerMinggu: 0,
      omzetPerBulan: 0,
      omzetPerTahun: 0,
      hppPasar,
    };
  }
  const pcsPerHari = hppPasar.perHari / marginPerPcs;
  const pcsPerMinggu = hppPasar.perMinggu / marginPerPcs;
  const pcsPerBulan = hppPasar.perBulan / marginPerPcs;
  const pcsPerTahun = hppPasar.perTahun / marginPerPcs;
  return {
    pcsPerHari,
    pcsPerMinggu,
    pcsPerBulan,
    pcsPerTahun,
    omzetPerHari: pcsPerHari * hargaJualRataRata,
    omzetPerMinggu: pcsPerMinggu * hargaJualRataRata,
    omzetPerBulan: pcsPerBulan * hargaJualRataRata,
    omzetPerTahun: pcsPerTahun * hargaJualRataRata,
    hppPasar,
  };
}

export function findEarliestMarketDate(salesRows) {
  let earliest = null;
  for (const s of salesRows) {
    if (!MARKET_LOCATIONS.includes(s.location) || !s.date) continue;
    if (!earliest || s.date < earliest) earliest = s.date;
  }
  return earliest;
}

export function computeSaldoHarian({ salesRows, biayaMap, marginPerPcs, startDate, endDate }) {
  const byDate = {};
  for (const s of salesRows) {
    if (!s.date) continue;
    if (!byDate[s.date]) byDate[s.date] = { marginTerkumpul: 0, pcsLakuAktual: 0 };
    const sign = s.type === "retur" ? -1 : 1;
    for (const item of s.items ?? []) {
      byDate[s.date].marginTerkumpul += sign * itemProfit(item);
      byDate[s.date].pcsLakuAktual += sign * effQty(item);
    }
  }

  const ledger = [];
  let saldo = 0;
  if (!startDate) return { ledger, saldoAkhir: 0 };

  const cur = new Date(startDate + "T00:00:00");
  const end = new Date((endDate ?? localDateStr()) + "T00:00:00");

  while (cur <= end) {
    const tanggal = localDateStr(cur);
    const lokasi = getMarketLocation(cur);
    const isMarketDay = lokasi !== "gudang";
    const data = byDate[tanggal] ?? { marginTerkumpul: 0, pcsLakuAktual: 0 };
    const hppPasarHariIni = isMarketDay ? getHppPasarPerHari(biayaMap[lokasi], lokasi) : 0;
    const saldoSebelumnya = saldo;
    const saldoBaru = saldoSebelumnya + data.marginTerkumpul - hppPasarHariIni;
    const targetPcsHariIni =
      marginPerPcs > 0 ? Math.max(0, hppPasarHariIni - saldoSebelumnya) / marginPerPcs : 0;
    ledger.push({
      tanggal,
      lokasi,
      isMarketDay,
      hppPasarHariIni,
      saldoSebelumnya,
      pcsLakuAktual: data.pcsLakuAktual,
      marginTerkumpul: data.marginTerkumpul,
      saldoBaru,
      targetPcsHariIni,
      status: saldoBaru < 0 ? "DEFISIT" : "TABUNGAN",
    });
    saldo = saldoBaru;
    cur.setDate(cur.getDate() + 1);
  }

  return { ledger, saldoAkhir: saldo };
}

export function computeTargetProduksi({
  saldoBerjalan,
  biayaMap,
  marginPerPcs,
  biayaPerPcs,
  mulaiOffsetHari = 1,
  hariKeDepan = 7,
  pcsTambahanPerMinggu = 0,
}) {
  let hppPasarPeriode = 0;
  const cur = new Date();
  cur.setDate(cur.getDate() + mulaiOffsetHari);
  for (let i = 0; i < hariKeDepan; i++) {
    const lokasi = getMarketLocation(cur);
    if (lokasi !== "gudang") hppPasarPeriode += getHppPasarPerHari(biayaMap[lokasi], lokasi);
    cur.setDate(cur.getDate() + 1);
  }
  const pcsOngkosPasar =
    marginPerPcs > 0 ? Math.max(0, hppPasarPeriode - saldoBerjalan) / marginPerPcs : 0;
  const pcsKejarUtang = (pcsTambahanPerMinggu ?? 0) * (hariKeDepan / 7);
  const targetProduksiPcs = pcsOngkosPasar + pcsKejarUtang;
  const modalBahanDibutuhkan = targetProduksiPcs * (biayaPerPcs ?? 0);
  return {
    hppPasarPeriode,
    pcsOngkosPasar,
    pcsTambahanPerMinggu: pcsTambahanPerMinggu ?? 0,
    pcsKejarUtang,
    targetProduksiPcs,
    modalBahanDibutuhkan,
  };
}

export function getSisaHariMingguIni(today = new Date()) {
  const dow = today.getDay();
  return dow === 0 ? 1 : 7 - dow + 1;
}

export function computeKebutuhanBahanMingguan(
  salesRows,
  hppRataRata,
  { windowDays = 60, today = new Date() } = {},
) {
  let rows = salesRows;
  if (windowDays) {
    const since = localDateStr(new Date(today.getTime() - windowDays * 86400000));
    rows = salesRows.filter((s) => (s.date ?? "") >= since);
  }
  let totalPcs = 0;
  for (const s of rows) {
    const sign = s.type === "retur" ? -1 : 1;
    for (const item of s.items ?? []) totalPcs += sign * effQty(item);
  }
  if (totalPcs <= 0 && windowDays) {
    return computeKebutuhanBahanMingguan(salesRows, hppRataRata, { windowDays: 0, today });
  }
  let effectiveWindowDays = windowDays;
  if (!windowDays) {
    const dates = salesRows.map((s) => s.date).filter(Boolean).sort();
    effectiveWindowDays =
      dates.length >= 2
        ? Math.max((new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000, 1)
        : 1;
  }
  const pcsPerMinggu = totalPcs > 0 ? totalPcs / (effectiveWindowDays / 7) : 0;
  const modalBahanMingguan = pcsPerMinggu * (hppRataRata ?? 0);
  return { pcsPerMinggu, modalBahanMingguan, totalPcs, effectiveWindowDays };
}

export function computeProyeksiUtangVsSaldo({
  utangRows,
  saldoSaatIni,
  marginPerPcs,
  pcsPerMinggu,
  biayaMap,
  today = new Date(),
}) {
  let ongkosPasarPerMingguGabungan = 0;
  for (const lokasi of Object.keys(biayaMap ?? {})) {
    ongkosPasarPerMingguGabungan += getHppPasarPerPeriode(biayaMap[lokasi], lokasi).perMinggu;
  }
  const netPerMinggu = (marginPerPcs ?? 0) * (pcsPerMinggu ?? 0) - ongkosPasarPerMingguGabungan;

  const todayStr = localDateStr(today);
  const byBulan = {};
  for (const u of utangRows ?? []) {
    if (!u.jatuh_tempo || !(u.total_harga > 0)) continue;
    const bulan = u.jatuh_tempo.slice(0, 7);
    if (!byBulan[bulan]) byBulan[bulan] = { bulan, total: 0, tanggalTerakhir: u.jatuh_tempo };
    byBulan[bulan].total += u.total_harga;
    if (u.jatuh_tempo > byBulan[bulan].tanggalTerakhir) byBulan[bulan].tanggalTerakhir = u.jatuh_tempo;
  }
  const bulanList = Object.values(byBulan).sort((a, b) => a.bulan.localeCompare(b.bulan));

  let cumulativeUtang = 0;
  let bulanKekurangan = null;
  const skedul = bulanList.map((b) => {
    cumulativeUtang += b.total;
    const mingguKeDepan = Math.max(
      (new Date(b.tanggalTerakhir + "T00:00:00") - new Date(todayStr + "T00:00:00")) / (7 * 86400000),
      0,
    );
    const saldoProyeksi = saldoSaatIni + netPerMinggu * mingguKeDepan;
    const gap = saldoProyeksi - cumulativeUtang;
    const aman = gap >= 0;
    if (!aman && !bulanKekurangan) bulanKekurangan = b.bulan;
    const pcsTambahanDibutuhkan = !aman && marginPerPcs > 0 ? Math.abs(gap) / marginPerPcs : 0;
    const pcsTambahanPerMinggu =
      !aman && mingguKeDepan > 0 ? pcsTambahanDibutuhkan / mingguKeDepan : pcsTambahanDibutuhkan;
    return {
      bulan: b.bulan,
      tanggalTerakhir: b.tanggalTerakhir,
      utangBulanIni: b.total,
      cumulativeUtang,
      mingguKeDepan,
      saldoProyeksi,
      gap,
      aman,
      pcsTambahanDibutuhkan,
      pcsTambahanPerMinggu,
    };
  });

  return { skedul, netPerMinggu, bulanKekurangan, totalUtang: cumulativeUtang };
}
