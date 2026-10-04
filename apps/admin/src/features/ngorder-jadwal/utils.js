/**
 * features/ngorder-jadwal/utils.js — pure helpers Jadwal Ngorder (tanpa React/Supabase).
 */
export const TRIP_STATUS_LABEL = { rencana: "Rencana", berjalan: "Berjalan", selesai: "Selesai", batal: "Batal" };
export const TRIP_STATUSES = ["rencana", "berjalan", "selesai", "batal"];

export const BIAYA_KATEGORI = [
  { key: "bensin", label: "Bensin" },
  { key: "tol", label: "Tol" },
  { key: "transport", label: "Transport" },
  { key: "makan", label: "Makan" },
  { key: "penginapan", label: "Penginapan" },
  { key: "parkir", label: "Parkir" },
  { key: "lainnya", label: "Lainnya" },
];
export const BIAYA_LABEL = Object.fromEntries(BIAYA_KATEGORI.map((k) => [k.key, k.label]));

export function fmtRp(n) {
  return `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
}

/** Tanggal LOKAL yyyy-mm-dd (JANGAN toISOString — geser zona waktu, lihat CLAUDE.md §13). */
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const parseYmd = (s) => {
  const [y, m, d] = (s ?? "").split("-").map(Number);
  return { y, m, d };
};

export function fmtTanggalRange(mulai, selesai) {
  const a = parseYmd(mulai);
  if (!a.y) return "";
  const b = parseYmd(selesai || mulai);
  if (!selesai || mulai === selesai) return `${a.d} ${BULAN[a.m - 1]} ${a.y}`;
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${BULAN[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${BULAN[a.m - 1]} – ${b.d} ${BULAN[b.m - 1]} ${b.y}`;
  return `${a.d} ${BULAN[a.m - 1]} ${a.y} – ${b.d} ${BULAN[b.m - 1]} ${b.y}`;
}

/** Jumlah hari inklusif (3 Okt – 5 Okt = 3). */
export function durasiHari(mulai, selesai) {
  const a = parseYmd(mulai);
  const b = parseYmd(selesai || mulai);
  if (!a.y || !b.y) return 0;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000) + 1;
}

export const totalBiaya = (biaya) => (biaya ?? []).reduce((s, b) => s + (Number(b.jumlah) || 0), 0);

/** [{key,label,total}] hanya kategori yg terpakai, terbesar dulu. */
export function biayaPerKategori(biaya) {
  const sums = new Map();
  for (const b of biaya ?? []) sums.set(b.kategori, (sums.get(b.kategori) ?? 0) + (Number(b.jumlah) || 0));
  return [...sums.entries()]
    .filter(([, total]) => total > 0)
    .map(([key, total]) => ({ key, label: BIAYA_LABEL[key] ?? key, total }))
    .sort((x, y) => y.total - x.total);
}

export function summarizeTrip(trip) {
  const toko = trip?.toko ?? [];
  const sampel = trip?.sampel ?? [];
  const modal = Number(trip?.modal_awal) || 0;
  const terpakai = totalBiaya(trip?.biaya);
  return {
    hari: durasiHari(trip?.tanggal_mulai, trip?.tanggal_selesai),
    totalToko: toko.length,
    dikunjungi: toko.filter((t) => t.dikunjungi).length,
    sampelBawa: sampel.reduce((s, x) => s + (Number(x.qty) || 0), 0),
    sampelTerbagi: sampel.reduce((s, x) => s + (Number(x.terbagi) || 0), 0),
    modal,
    terpakai,
    sisa: modal - terpakai,
    overBudget: terpakai > modal,
    persenModal: modal > 0 ? Math.min(100, Math.round((terpakai / modal) * 100)) : terpakai > 0 ? 100 : 0,
  };
}

/** Berjalan & rencana dulu (terdekat di atas), lalu selesai/batal (terbaru di atas). */
export function sortTrips(trips) {
  const rank = { berjalan: 0, rencana: 1, selesai: 2, batal: 3 };
  return [...(trips ?? [])].sort((a, b) => {
    const ra = rank[a.status] ?? 9;
    const rb = rank[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    const cmp = (a.tanggal_mulai ?? "").localeCompare(b.tanggal_mulai ?? "");
    return ra <= 1 ? cmp : -cmp;
  });
}

export function validateTrip({ nama, tanggal_mulai, tanggal_selesai }) {
  if (!(nama ?? "").trim()) return "Nama jadwal wajib diisi.";
  if (!tanggal_mulai || !tanggal_selesai) return "Tanggal mulai & selesai wajib diisi.";
  if (tanggal_selesai < tanggal_mulai) return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  return "";
}

// ── mutasi array (pure) ───────────────────────────────────────────────────
export function addTokoToTrip(list, toko) {
  if ((list ?? []).some((t) => t.toko_id === toko.id)) return list;
  return [...(list ?? []), { toko_id: toko.id, nama: toko.nama, daerah: toko.daerah ?? "", dikunjungi: false }];
}
export const removeTokoFromTrip = (list, tokoId) => (list ?? []).filter((t) => t.toko_id !== tokoId);
export const toggleTokoVisited = (list, tokoId) =>
  (list ?? []).map((t) => (t.toko_id === tokoId ? { ...t, dikunjungi: !t.dikunjungi } : t));

export function addSampelToTrip(list, { kode, nama }) {
  if ((list ?? []).some((s) => s.kode === kode)) return list;
  return [...(list ?? []), { kode, nama: nama ?? "", qty: 1, terbagi: 0 }];
}
export const removeSampelFromTrip = (list, kode) => (list ?? []).filter((s) => s.kode !== kode);
/** field: "qty" | "terbagi"; terbagi tidak boleh > qty, qty tidak boleh < 0. */
export function changeSampelQty(list, kode, field, delta) {
  return (list ?? []).map((s) => {
    if (s.kode !== kode) return s;
    const next = { ...s };
    if (field === "qty") {
      next.qty = Math.max(0, (Number(s.qty) || 0) + delta);
      next.terbagi = Math.min(Number(s.terbagi) || 0, next.qty);
    } else {
      next.terbagi = Math.min(Math.max(0, (Number(s.terbagi) || 0) + delta), Number(s.qty) || 0);
    }
    return next;
  });
}

let biayaSeq = 0;
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `b-${Date.now().toString(36)}-${(biayaSeq++).toString(36)}`;
export function addBiaya(list, { tanggal, kategori, jumlah, catatan }) {
  const n = Math.round(Number(jumlah) || 0);
  if (n <= 0) return list;
  return [...(list ?? []), { id: newId(), tanggal, kategori, jumlah: n, catatan: (catatan ?? "").trim() }];
}
export const removeBiaya = (list, id) => (list ?? []).filter((b) => b.id !== id);

/** Salinan utk jadwal berikutnya: daerah/peserta/sampel/toko sama, progres & biaya direset. */
export function duplicateTripPayload(trip, today = localDateStr()) {
  return {
    nama: `${trip.nama} (salinan)`,
    tanggal_mulai: today,
    tanggal_selesai: today,
    daerah: trip.daerah ?? [],
    peserta: trip.peserta ?? [],
    modal_awal: 0,
    status: "rencana",
    sampel: (trip.sampel ?? []).map((s) => ({ ...s, terbagi: 0 })),
    toko: (trip.toko ?? []).map((t) => ({ ...t, dikunjungi: false })),
    biaya: [],
    catatan: "",
  };
}

/** Teks ringkasan utk dibagikan (WA). */
export function buildTripShareText(trip) {
  const s = summarizeTrip(trip);
  const lines = [
    `*${trip.nama}* (${TRIP_STATUS_LABEL[trip.status] ?? trip.status})`,
    `Tanggal: ${fmtTanggalRange(trip.tanggal_mulai, trip.tanggal_selesai)} (${s.hari} hari)`,
  ];
  if (trip.daerah?.length) lines.push(`Daerah: ${trip.daerah.join(", ")}`);
  if (trip.peserta?.length) lines.push(`Berangkat: ${trip.peserta.join(", ")}`);
  lines.push(`Toko: ${s.dikunjungi}/${s.totalToko} dikunjungi`);
  if (s.sampelBawa > 0) lines.push(`Sampel: bawa ${s.sampelBawa} pcs, terbagi ${s.sampelTerbagi} pcs`);
  lines.push(`Modal ${fmtRp(s.modal)} · terpakai ${fmtRp(s.terpakai)} · sisa ${fmtRp(s.sisa)}`);
  return lines.join("\n");
}

// ── Kalender bulanan ──────────────────────────────────────────────────────
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const NAMA_HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Minggu-minggu (Senin pertama) yang menutupi 1 bulan: string[][7] "yyyy-mm-dd". month 0-11. */
export function monthGrid(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => localDateStr(new Date(year, month, 1 - offset + w * 7 + d))),
  );
}

const byMulai = (a, b) => (a.tanggal_mulai ?? "").localeCompare(b.tanggal_mulai ?? "") || (a.nama ?? "").localeCompare(b.nama ?? "");

export function tripsOnDate(trips, ymd) {
  return (trips ?? []).filter((t) => t.tanggal_mulai <= ymd && t.tanggal_selesai >= ymd).sort(byMulai);
}

export function tripsInMonth(trips, year, month) {
  const first = localDateStr(new Date(year, month, 1));
  const last = localDateStr(new Date(year, month + 1, 0));
  return (trips ?? []).filter((t) => t.tanggal_mulai <= last && t.tanggal_selesai >= first).sort(byMulai);
}

/**
 * Susun bar jadwal utk 1 minggu (7 tanggal): [{ trip, start, span, row, contLeft, contRight }].
 * start 0-6 = kolom awal; row = baris bar (tidak ada 2 bar saling tumpang di 1 baris);
 * contLeft/contRight = jadwal berlanjut dari/ke minggu lain.
 */
export function layoutWeekBars(trips, weekDays) {
  const first = weekDays[0];
  const last = weekDays[6];
  const bars = (trips ?? [])
    .filter((t) => t.tanggal_mulai <= last && t.tanggal_selesai >= first)
    .map((trip) => {
      const contLeft = trip.tanggal_mulai < first;
      const contRight = trip.tanggal_selesai > last;
      const start = contLeft ? 0 : weekDays.indexOf(trip.tanggal_mulai);
      const end = contRight ? 6 : weekDays.indexOf(trip.tanggal_selesai);
      return { trip, start, span: end - start + 1, contLeft, contRight, row: 0 };
    })
    .sort((a, b) => a.start - b.start || b.span - a.span || (a.trip.nama ?? "").localeCompare(b.trip.nama ?? ""));
  const rows = [];
  for (const bar of bars) {
    let r = 0;
    while (rows[r]?.some((o) => bar.start <= o.start + o.span - 1 && o.start <= bar.start + bar.span - 1)) r++;
    (rows[r] ??= []).push(bar);
    bar.row = r;
  }
  return { bars, rows: rows.length };
}
