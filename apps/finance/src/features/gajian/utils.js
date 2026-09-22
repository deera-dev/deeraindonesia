/**
 * utils.js — Pure helpers fitur Gajian (kalkulasi upah, rincian, teks WA).
 * Tidak ada React, tidak ada Supabase.
 */
import { fmtRp as fmtRpLocal, fmtTanggal } from "../../shared/lib/format";

export const TABS = ["Potong", "Jahit", "Finishing", "QC", "Kreatif", "CMT", "Ringkasan"];

export const JAHIT_MARKS = [20000, 23000, 25000, 30000, 35000];

export const newKartu = () => ({ kode: "", warna: "", ukuran: "", jumlah: "", upah: 20000 });
export const newPermak = () => ({ keterangan: "", jumlah: "", upah: "" });
// Permintaan Denny 2026-09: Kancing diisi PER PCS (bukan total manual lagi)
// — total dihitung otomatis (jumlah × kancing_per_pcs), lihat calcKancingQty.
// Lubang: opsional per produk (toggle pakai_lubang), qty-nya input TERPISAH
// dari Kancing (lubang_per_pcs) — jumlah lubang tidak selalu sama dgn kancing.
export const newProduk = () => ({
  kode_produk: "",
  nama_produk: "",
  jumlah: "",
  kancing_per_pcs: "",
  pakai_lubang: false,
  lubang_per_pcs: "",
});

// ── Kalkulasi upah (menerima cfg dari features/pengaturan, fallback default-nya) ──

/** Hitung total upah Tim Potong. tarif_potongan: 4000–6000 per pcs (range slider) */
export function calcUpahPotong({ jumlah_pola = 0, jumlah_sampel = 0, qty_potongan = 0, tarif_potongan = 4000 }, cfg) {
  return jumlah_pola * cfg.tarif_pola + jumlah_sampel * cfg.tarif_sampel + qty_potongan * tarif_potongan;
}

/** Total tarif finishing per pcs (jumlah semua komponen) */
export function calcFinishingPerPcs(cfg) {
  return (
    (cfg.tarif_gosok || 0) +
    (cfg.tarif_lipat || 0) +
    (cfg.tarif_buang_benang || 0) +
    (cfg.tarif_pasang_pin || 0) +
    (cfg.tarif_hangtag || 0) +
    (cfg.tarif_seri || 0)
  );
}

/** Hitung total upah Tim Finishing. items: [{nama_produk, jumlah, kancing_qty, lubang_qty}] */
export function calcUpahFinishing(items = [], cfg) {
  const tarifPcs = calcFinishingPerPcs(cfg);
  return items.reduce(
    (sum, item) =>
      sum +
      (Number(item.jumlah) || 0) * tarifPcs +
      (Number(item.kancing_qty) || 0) * cfg.tarif_kancing +
      (Number(item.lubang_qty) || 0) * (cfg.tarif_lubang || 0),
    0,
  );
}

// ── Kancing per-pcs & Lubang (permintaan Denny 2026-09) ──────────────────────
// Sebelumnya field "Kancing (qty)" di FinishingForm diisi TOTAL manual (mis.
// 336 utk 42 pcs × 8 kancing/pcs — admin harus kalikan sendiri). Sekarang
// diisi kancing PER PCS (8), totalnya dihitung otomatis di sini.

/** Total kancing = jumlah pcs × kancing per pcs. */
export function calcKancingQty(jumlah, kancingPerPcs) {
  return (Number(jumlah) || 0) * (Number(kancingPerPcs) || 0);
}

/**
 * deriveKancingPerPcs — fallback utk record LAMA yang cuma nyimpen total
 * kancing_qty tanpa kancing_per_pcs (dibuat sebelum fitur ini ada). Dipakai
 * FinishingForm supaya buka-edit record lama TIDAK kehilangan nilai kancing
 * walau admin belum ketik ulang field per-pcs-nya (baseline "kalau field
 * dikosongkan, pakai nilai lama" — sama seperti field jumlah/kancing yang
 * lain). Kalau kancing_per_pcs sudah ada (record baru), pakai itu langsung;
 * kalau tidak, derive dari total lama ÷ jumlah lama.
 */
export function deriveKancingPerPcs(oldItem) {
  if (!oldItem) return 0;
  if (oldItem.kancing_per_pcs !== undefined && oldItem.kancing_per_pcs !== null && oldItem.kancing_per_pcs !== "") {
    return Number(oldItem.kancing_per_pcs) || 0;
  }
  const oldJumlah = Number(oldItem.jumlah) || 0;
  const oldKancing = Number(oldItem.kancing_qty) || 0;
  return oldJumlah > 0 ? oldKancing / oldJumlah : 0;
}

/** Total lubang = jumlah pcs × lubang per pcs, HANYA kalau toggle "Pakai Lubang" aktif. */
export function calcLubangQty(jumlah, lubangPerPcs, pakaiLubang) {
  if (!pakaiLubang) return 0;
  return (Number(jumlah) || 0) * (Number(lubangPerPcs) || 0);
}

/**
 * summarizeFinishingItems — breakdown Total Finishing / Total Kancing /
 * Total Lubang dari sekumpulan item (permintaan Denny 2026-09: info total
 * per komponen, bukan cuma gabungan "Total Upah"). `items` di sini sudah
 * berisi kancing_qty/lubang_qty (total per baris, bukan per-pcs).
 */
export function summarizeFinishingItems(items = [], cfg) {
  const tarifPcs = calcFinishingPerPcs(cfg);
  let totalFinishingBiaya = 0;
  let totalKancingQty = 0;
  let totalLubangQty = 0;
  for (const item of items) {
    totalFinishingBiaya += (Number(item.jumlah) || 0) * tarifPcs;
    totalKancingQty += Number(item.kancing_qty) || 0;
    totalLubangQty += Number(item.lubang_qty) || 0;
  }
  const totalKancingBiaya = totalKancingQty * (cfg.tarif_kancing || 0);
  const totalLubangBiaya = totalLubangQty * (cfg.tarif_lubang || 0);
  return {
    totalFinishingBiaya,
    totalKancingQty,
    totalKancingBiaya,
    totalLubangQty,
    totalLubangBiaya,
    grandTotal: calcUpahFinishing(items, cfg),
  };
}

// ── Auto-isi Jumlah QC dari total Finishing (permintaan Denny 2026-09) ──────
// "input gajian QA, saya mau otomatis aja diambil dari total baju yang telah
// selesai di finishing... dengan opsi bisa edit" — QCForm.jsx pakai ini utk
// auto-isi "Jumlah QC (pcs)" saat TAMBAH entri baru (bukan edit), dijumlah
// dari SEMUA kode di satu entri Finishing periode ini (bukan per-kode —
// sesuai contoh Denny: kode 001 20pcs + 002 5pcs + 003 10pcs = 35pcs total).

/** Total pcs Finishing (semua kode digabung) dari `items` satu entri gaji_finishing. */
export function sumFinishingItemsJumlah(items = []) {
  return items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
}

// ── Auto-pilih opsi dropdown kalau cuma ada 1 (permintaan Denny 2026-09:
// "untuk setiap dropdown, kalau pilihannya hanya ada 1 opsi, maka otomatis
// terpilih, tetapi jika lebih dari 1 jangan ada yang dipilih dulu") ─────────
// Dipakai di FinishingStockModal utk dropdown Ukuran/Warna baris manual:
// kalau produk cuma punya 1 varian ukuran atau 1 warna, langsung terisi
// otomatis biar admin tidak perlu klik pilih padahal cuma ada 1 opsi. Kalau
// opsi > 1 (atau 0), TETAP kosong — jangan asal pilih opsi pertama, supaya
// admin sadar harus memilih sendiri.
export function autoSelectIfSingle(options = []) {
  const valid = (options ?? []).filter(Boolean);
  return valid.length === 1 ? valid[0] : "";
}

/** Hitung total upah Tim Kreatif. */
export function calcUpahKreatif({ jumlah_video = 0, jumlah_foto = 0, jumlah_logo = 0 }, cfg) {
  return jumlah_video * cfg.tarif_video + jumlah_foto * cfg.tarif_foto + jumlah_logo * cfg.tarif_logo;
}

// ── Rincian perkalian per karyawan (dipakai PerKaryawan & ShareModal) ─────────

/** Tim Potong: pola/sampel/qty masing-masing × tarifnya */
export function rincianPotong(r, cfg) {
  const out = [];
  const jp = Number(r.jumlah_pola) || 0;
  const js = Number(r.jumlah_sampel) || 0;
  const qp = Number(r.qty_potongan) || 0;
  const tp = Number(r.tarif_potongan) || 0;
  if (jp > 0) out.push({ label: `${jp} pola × ${fmtRpLocal(cfg.tarif_pola)}`, sub: jp * cfg.tarif_pola });
  if (js > 0) out.push({ label: `${js} sampel × ${fmtRpLocal(cfg.tarif_sampel)}`, sub: js * cfg.tarif_sampel });
  if (qp > 0) out.push({ label: `${qp} pcs potong × ${fmtRpLocal(tp)}`, sub: qp * tp });
  const manual = (Number(r.total_upah) || 0) - (jp * cfg.tarif_pola + js * cfg.tarif_sampel + qp * tp);
  if (manual !== 0) out.push({ label: "Tambahan manual", sub: manual });
  return out;
}

/** Tim Jahit: tiap kartu & permak × upahnya masing-masing */
export function rincianJahit(r) {
  const out = [];
  for (const it of r.kartu_items ?? []) {
    const jml = Number(it.jumlah) || 0;
    const upah = Number(it.upah) || 0;
    if (jml <= 0) continue;
    const ket = [it.kode, it.ukuran, it.warna].filter(Boolean).join(" · ");
    out.push({ label: `${jml} pcs${ket ? ` (${ket})` : ""} × ${fmtRpLocal(upah)}`, sub: jml * upah });
  }
  for (const it of r.permak_items ?? []) {
    const jml = Number(it.jumlah) || 0;
    const upah = Number(it.upah) || 0;
    if (jml <= 0) continue;
    out.push({ label: `Permak${it.keterangan ? ` ${it.keterangan}` : ""} ${jml} × ${fmtRpLocal(upah)}`, sub: jml * upah });
  }
  return out;
}

/** Tim Kreatif: video/foto/logo masing-masing × tarifnya */
export function rincianKreatif(r, cfg) {
  const out = [];
  const v = Number(r.jumlah_video) || 0;
  const f = Number(r.jumlah_foto) || 0;
  const l = Number(r.jumlah_logo) || 0;
  if (v > 0) out.push({ label: `${v} video × ${fmtRpLocal(cfg.tarif_video)}`, sub: v * cfg.tarif_video });
  if (f > 0) out.push({ label: `${f} foto seri × ${fmtRpLocal(cfg.tarif_foto)}`, sub: f * cfg.tarif_foto });
  if (l > 0) out.push({ label: `${l} logo × ${fmtRpLocal(cfg.tarif_logo)}`, sub: l * cfg.tarif_logo });
  const manual = (Number(r.total_upah) || 0) - (v * cfg.tarif_video + f * cfg.tarif_foto + l * cfg.tarif_logo);
  if (manual !== 0) out.push({ label: "Tambahan manual", sub: manual });
  return out;
}

/** Tim QC: pcs QC × tarifnya */
export function rincianQC(r, cfg) {
  const out = [];
  const pcs = Number(r.jumlah_pcs) || 0;
  if (pcs > 0) out.push({ label: `${pcs} pcs QC × ${fmtRpLocal(cfg.tarif_qc)}`, sub: pcs * cfg.tarif_qc });
  const manual = (Number(r.total_upah) || 0) - pcs * cfg.tarif_qc;
  if (manual !== 0) out.push({ label: "Tambahan manual", sub: manual });
  return out;
}

/**
 * Gabungkan baris potong/jahit/(qc)/kreatif jadi map per-nama-karyawan
 * { [nama]: { ...karyawan, total, rincian: [...] } }, lalu kembalikan sebagai
 * array entries terurut total desc.
 *
 * includeQC membedakan dua pemakaian asli:
 * - ShareModal (useShareData lama)     → includeQC: true
 * - Ringkasan inline (PerKaryawan lama) → includeQC: false
 * (qc tidak disertakan di breakdown inline Ringkasan — perbedaan ini nyata
 * dan dipertahankan, bukan bug yang harus disamakan.)
 */
export function buildPerKaryawanMap({ potong = [], jahit = [], qc = [], kreatif = [], cfg, includeQC = false }) {
  const map = {};
  const add = (r, lines) => {
    const nama = r.karyawan?.nama ?? "—";
    if (!map[nama]) map[nama] = { ...r.karyawan, total: 0, rincian: [] };
    map[nama].total += r.total_upah || 0;
    map[nama].rincian.push(...lines);
  };
  for (const r of potong) add(r, rincianPotong(r, cfg));
  for (const r of jahit) add(r, rincianJahit(r));
  if (includeQC) for (const r of qc) add(r, rincianQC(r, cfg));
  for (const r of kreatif) add(r, rincianKreatif(r, cfg));
  return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
}

// ── Tambahan / kasbon ──────────────────────────────────────────────────────────

export function sumTambahan(tambahan = []) {
  return tambahan.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
}

export function sumKasbonDeduction(kasbon = [], kasbonDeds = {}) {
  return kasbon.reduce((s, kb) => s + Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa), 0);
}

/** Bentuk payload kasbon_deductions ({kasbon_id, karyawan_id, nama, jumlah}) dari state form. */
export function buildKasbonDeductionsPayload(kasbon = [], kasbonDeds = {}) {
  return kasbon
    .filter((kb) => Number(kasbonDeds[kb.id]) > 0)
    .map((kb) => ({
      kasbon_id: kb.id,
      karyawan_id: kb.karyawan_id,
      nama: kb.karyawan?.nama ?? "",
      jumlah: Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa),
    }));
}

/** Buang entri tambahan kosong (tanpa label maupun jumlah) sebelum disimpan. */
export function cleanTambahan(tambahan = []) {
  return tambahan.filter((it) => it.label || it.jumlah);
}

// ── "Beli Gas" & "Persiapan ATK" (permintaan Denny 2026-09) ─────────────────
// Dua tambahan baru di Ringkasan, selain "Uang Denny & Wulan Terpakai" yg
// sudah ada: checkbox "Beli Gas" (nominal TETAP Rp100.000, tinggal centang)
// dan input manual "Persiapan ATK" (nominal bebas, WAJIB tanpa default value
// — cuma placeholder, sama seperti field jumlah/kancing di form lain).
//
// Desain: SENGAJA tidak nambah kolom baru di gajian_minggu — dua-duanya
// disimpan sebagai entri biasa di kolom `tambahan` (jsonb array) yang sudah
// ada, dgn label baku (BELI_GAS_LABEL/PERSIAPAN_ATK_LABEL) supaya otomatis
// ikut kehitung di sumTambahan/calcTotalRequest, otomatis muncul di
// ringkasan & teks WA (generateWAText sudah iterasi `tambahan` generik),
// TANPA perlu ubah skema atau logic totals sama sekali. TabRingkasan.jsx
// yang menyediakan UI KHUSUS (checkbox + input manual) utk dua entri ini,
// terpisah dari daftar "Tambahan Lain" freeform — lihat otherTambahan() di
// bawah utk memisahkan keduanya dari daftar freeform itu supaya tidak
// dobel-edit dari dua tempat.
export const BELI_GAS_LABEL = "Beli Gas";
export const BELI_GAS_AMOUNT = 100000;
export const PERSIAPAN_ATK_LABEL = "Persiapan ATK";

/** Cari satu entri tambahan berdasarkan label persis (dipakai init checkbox/placeholder saat edit). */
export function findTambahanByLabel(tambahan = [], label) {
  return tambahan.find((t) => t.label === label) ?? null;
}

/** Daftar tambahan freeform SAJA — Beli Gas & Persiapan ATK dikeluarkan krn py UI dedicated sendiri. */
export function otherTambahan(tambahan = []) {
  return tambahan.filter((t) => t.label !== BELI_GAS_LABEL && t.label !== PERSIAPAN_ATK_LABEL);
}

/**
 * Gabungkan lagi: daftar tambahan freeform + Beli Gas (kalau dicentang) +
 * Persiapan ATK (kalau > 0) jadi SATU array `tambahan` final siap disimpan
 * (gaji_minggu.tambahan) — dipakai TabRingkasan.jsx sebelum panggil
 * saveGajianRequest/finalizeGajian, dan utk hitung total & preview ringkasan.
 */
export function buildTambahanPayload({ otherItems = [], beliGasEnabled = false, atkJumlah = 0 }) {
  const out = [...otherItems];
  if (beliGasEnabled) out.push({ label: BELI_GAS_LABEL, jumlah: BELI_GAS_AMOUNT });
  const atk = Number(atkJumlah) || 0;
  if (atk > 0) out.push({ label: PERSIAPAN_ATK_LABEL, jumlah: atk });
  return out;
}

// ── Pettycash riil (fitur Petty Cash) — "Uang Denny & Wulan Terpakai" ────────

/**
 * "Uang Denny & Wulan Terpakai" = bagian saldo Petty Cash yang MINUS
 * (saldo = total "isi" − total "keluar", dari usePettycashAll()) — artinya
 * pengeluaran petty cash sudah melebihi topup, jadi selisihnya sudah
 * ditalangi/dibayar duluan dari kantong Denny & Wulan dan perlu diganti
 * lewat gajian minggu ini.
 *
 * BUKAN total pengeluaran "keluar" all-time (itu keliru — akan jauh lebih
 * besar dari saldo minus yang sebenarnya perlu diganti, lihat "SALDO PETTY
 * CASH SEKARANG" di halaman Petty untuk angka pembanding).
 *
 * Kalau saldo masih positif/nol (belum ada yang ditalangi), hasilnya 0 —
 * tidak ada yang perlu diganti.
 *
 * Dipakai TabRingkasan untuk switch "Tambahkan Pettycash?" (default ON) —
 * saat menyala, nilai Pettycash TIDAK diketik manual lagi, tapi otomatis
 * mengikuti angka ini.
 */
export function pettycashTerpakaiFromSaldo(saldo) {
  const s = Number(saldo) || 0;
  return s < 0 ? -s : 0;
}

/** Total mingguan: total gaji sistem + pettycash + tambahan lain − potongan kasbon. */
export function calcTotalRequest({ totalGaji = 0, pettycash = 0, tambahan = [], kasbon = [], kasbonDeds = {} }) {
  return totalGaji + (Number(pettycash) || 0) + sumTambahan(tambahan) - sumKasbonDeduction(kasbon, kasbonDeds);
}

// ── Teks WhatsApp ──────────────────────────────────────────────────────────────

export function generateWAText({ gajian, totals, perKaryawan, tambahan, pettycash, kasbonDeds, totalRequest }) {
  const fmtRp = fmtRpLocal;
  const isFinal = gajian.status === "final";
  const totalGaji = isFinal ? (gajian.total_gaji ?? 0) : (totals?.gaji ?? 0);
  const pc = isFinal ? (gajian.pettycash ?? 0) : (Number(pettycash) || 0);
  const tambs = ((isFinal ? gajian.tambahan : tambahan) ?? []).filter((t) => Number(t.jumlah) > 0);
  const kasbs = ((isFinal ? gajian.kasbon_deductions : kasbonDeds) ?? []).filter((k) => Number(k.jumlah) > 0);
  const treq = isFinal ? (gajian.total_request ?? 0) : totalRequest;
  const dedByNama = {};
  for (const k of kasbs) {
    const nama = k.nama || "—";
    dedByNama[nama] = (dedByNama[nama] ?? 0) + (Number(k.jumlah) || 0);
  }

  const sep = "━━━━━━━━━━━━━━━━━━━━━";
  const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));

  const timRows = [
    ["Tim Potong", isFinal ? gajian.total_potong : totals?.potong],
    ["Tim Jahit", isFinal ? gajian.total_jahit : totals?.jahit],
    ["Tim Finishing", isFinal ? gajian.total_finishing : totals?.finishing],
    ["Tim QC", isFinal ? gajian.total_qa : totals?.qa],
    ["Tim Kreatif", isFinal ? gajian.total_kreatif : totals?.kreatif],
    ["CMT Luar", isFinal ? gajian.total_cmt : totals?.cmt],
  ].filter(([, v]) => (v ?? 0) > 0);

  let lines = [];
  lines.push(`*🧾 GAJIAN DEERA*`);
  lines.push(`${fmtTanggal(gajian.tanggal_sabtu)}`);
  if (isFinal) lines.push(`✅ _Final_`);
  lines.push("");
  lines.push(sep);
  lines.push(`*RINCIAN PER TIM*`);
  for (const [label, val] of timRows) {
    lines.push(`${pad(label, 13)}: ${fmtRp(val ?? 0)}`);
  }
  lines.push(sep);
  lines.push(`*${pad("Total Gaji", 13)}: ${fmtRp(totalGaji)}*`);
  lines.push("");

  const hasTambahan = pc > 0 || tambs.length > 0 || kasbs.length > 0;
  if (hasTambahan) {
    lines.push(sep);
    lines.push(`*TAMBAHAN & POTONGAN*`);
    if (pc > 0) lines.push(`+ ${pad("Pettycash", 12)}: ${fmtRp(pc)}`);
    for (const t of tambs) lines.push(`+ ${pad(t.label || "Tambahan", 12)}: ${fmtRp(t.jumlah)}`);
    for (const k of kasbs) lines.push(`− ${pad("Kasbon " + (k.nama || ""), 12)}: −${fmtRp(k.jumlah)}`);
    lines.push(sep);
    lines.push(`*${pad("Total Mingguan", 13)}: ${fmtRp(treq)}*`);
    lines.push("");
  }

  if (perKaryawan.length > 0) {
    lines.push(sep);
    lines.push(`*TRANSFER PER KARYAWAN*`);
    for (const [nama, data] of perKaryawan) {
      const potongan = dedByNama[nama] ?? 0;
      const transfer = Math.max(data.total - potongan, 0);
      lines.push(`\n👤 *${nama}*`);
      if (data.nama_bank || data.no_rekening) {
        lines.push(`   ${[data.nama_bank, data.no_rekening].filter(Boolean).join(" · ")}`);
      }
      if (potongan > 0) {
        lines.push(`   ${fmtRp(data.total)} − Kasbon ${fmtRp(potongan)}`);
      }
      lines.push(`   *${fmtRp(transfer)}*`);
    }
    lines.push("");
  }

  lines.push(`_Deera Indonesia_`);
  return lines.join("\n");
}

// ── Rekonsiliasi Stok Masuk dari Finishing (permintaan Denny 2026-09) ────────
// Pure logic (tidak ada I/O) — dipanggil dari api.js (loadFinishingReconciliation)
// & FinishingStockModal.jsx (recalc saat admin edit qty baris). Lihat catatan
// panjang di gajian/api.js utk konteks lengkap kenapa breakdown size/warna
// diambil dari kartu Jahit, bukan dari form Finishing itu sendiri.

/** Total stok SEMUA lokasi (gudang+cideng+tegalgubug) untuk satu size+warna. */
export function stokTotalFor(stokRows, size, warna) {
  const row = (stokRows ?? []).find((r) => r.size === size && r.warna === warna);
  if (!row) return 0;
  return (Number(row.gudang) || 0) + (Number(row.cideng) || 0) + (Number(row.tegalgubug) || 0);
}

/** Qty sudah terjual (semua lokasi, semua waktu) untuk satu size+warna. */
export function soldQtyFor(soldRows, size, warna) {
  return (soldRows ?? []).find((r) => r.size === size && r.warna === warna)?.qty ?? 0;
}

/**
 * buildReconciliationRow — hitung berapa yang perlu ditambahkan ke stok
 * Gudang untuk satu baris size+warna: qty kartu dikurangi (stok yang sudah
 * ada di semua lokasi + yang sudah terjual), minimal 0 (konfirmasi Denny:
 * kalau hasilnya minus berarti sudah kebawa ke pasar/terjual duluan sebelum
 * Finishing resmi selesai, jadi tidak usah nambah apa-apa lagi).
 */
export function buildReconciliationRow({
  kode,
  size,
  warna,
  qtyKartu,
  cardId = null,
  qtyKartuPlaceholder = 0,
  soldRows,
  stokRows,
}) {
  const stokSaatIni = stokTotalFor(stokRows, size, warna);
  const terjualSaatIni = soldQtyFor(soldRows, size, warna);
  const qtyKartuNum = Number(qtyKartu) || 0;
  const qtyDitambahkan = Math.max(0, qtyKartuNum - stokSaatIni - terjualSaatIni);
  return {
    kode,
    size,
    warna,
    qtyKartu: qtyKartuNum,
    cardId,
    qtyKartuPlaceholder,
    stokSaatIni,
    terjualSaatIni,
    qtyDitambahkan,
  };
}

/** Recalc satu baris yang sudah ada (dipanggil FinishingStockModal saat admin ubah qtyKartu/size/warna manual). */
export function recalcReconciliationRow(row, soldRows, stokRows) {
  return buildReconciliationRow({ ...row, soldRows, stokRows });
}

/**
 * Baris kosong baru utk kasus mismatch (admin isi manual). `qtyKartu` WAJIB
 * mulai KOSONG ("", bukan 0) — permintaan Denny 2026-09: "ketika input stok
 * langsung ada default valuenya yaitu 0, saya gamau, maunya placeholder
 * aja". `placeholder` (opsional) dipakai FinishingStockModal.jsx sbg
 * placeholder input, BUKAN pre-fill value — biasanya diisi qty_kartu
 * terakhir dari stok_masuk_log kalau size+warna ini pernah direkonsiliasi
 * sebelumnya (lihat buildManualRowsFromLog di bawah), supaya admin yang
 * rekonsiliasi ulang (edit) langsung lihat angka sebelumnya tanpa dipaksa
 * ketik ulang dari nol, TANPA resiko ke-submit ulang otomatis kalau
 * dibiarkan kosong.
 */
export function newManualReconciliationRow(kode, { size = "", warna = "", placeholder = 0 } = {}) {
  return {
    kode,
    size,
    warna,
    qtyKartu: "",
    qtyKartuPlaceholder: placeholder,
    cardId: null,
    stokSaatIni: 0,
    terjualSaatIni: 0,
    qtyDitambahkan: 0,
  };
}

/**
 * buildManualRowsFromLog — saat kode TIDAK punya kartu Jahit "ready_finishing"
 * lagi (sudah "done" dari rekonsiliasi sebelumnya — kasus normal saat admin
 * rekonsiliasi ULANG lewat tombol manual "Rekonsiliasi Stok", lihat
 * TabFinishing.jsx), tapi kode ini PERNAH direkonsiliasi (ada riwayat di
 * stok_masuk_log) — seed baris manual per size+warna dari riwayat TERAKHIR,
 * dgn qty_kartu lama sbg PLACEHOLDER (bukan value). Dedupe per size+warna,
 * ambil baris paling baru (logRows diasumsikan sudah diurutkan created_at
 * DESC oleh caller/api.js).
 */
export function buildManualRowsFromLog(kode, logRows = []) {
  const seen = new Set();
  const rows = [];
  for (const log of logRows) {
    const key = `${log.size}__${log.warna}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(newManualReconciliationRow(kode, { size: log.size, warna: log.warna, placeholder: log.qty_kartu ?? 0 }));
  }
  return rows;
}

/**
 * buildKodeReconciliation — breakdown rekonsiliasi utk SATU kode dari satu
 * entri Finishing. "mismatch" = true kalau total qty kartu Ready Finishing
 * TIDAK sama dengan jumlah yang dicatat Finance (atau belum ada kartu sama
 * sekali) — FinishingStockModal.jsx menampilkan peringatan & baris kosong
 * utk diisi manual kalau mismatch.
 *
 * `logRows` (opsional, riwayat stok_masuk_log kode ini — lihat
 * fetchStokMasukLogByKode di api.js): dipakai HANYA kalau `cards` kosong —
 * ini kondisi normal saat admin rekonsiliasi ULANG (tombol manual di
 * TabFinishing.jsx) utk kode yang kartunya sudah "done" dari rekonsiliasi
 * sebelumnya. Alih-alih baris kosong tanpa acuan sama sekali, seed baris
 * manual per size+warna dari riwayat TERAKHIR (qty lama jadi PLACEHOLDER,
 * bukan value — lihat buildManualRowsFromLog & newManualReconciliationRow
 * di atas, permintaan Denny 2026-09).
 */
export function buildKodeReconciliation({ item, cards, soldRows, stokRows, logRows = [] }) {
  const cardsSum = (cards ?? []).reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const mismatch = (cards ?? []).length === 0 || cardsSum !== Number(item.jumlah);
  const rows =
    (cards ?? []).length > 0
      ? cards.map((c) =>
          buildReconciliationRow({
            kode: item.kode_produk,
            size: c.size,
            warna: c.warna,
            qtyKartu: c.qty,
            cardId: c.id,
            soldRows,
            stokRows,
          }),
        )
      : buildManualRowsFromLog(item.kode_produk, logRows);
  return {
    kode: item.kode_produk,
    nama: item.nama_produk,
    jumlahFinance: Number(item.jumlah) || 0,
    cardsSum,
    mismatch,
    rows,
    // Disertakan (bukan cuma dipakai internal) supaya FinishingStockModal.jsx
    // bisa recalc baris manual yang size/warna-nya diubah admin, tanpa perlu
    // fetch ulang ke server tiap kali diedit.
    soldRows: soldRows ?? [],
    stokRows: stokRows ?? [],
  };
}

// ── Sinkronisasi otomatis Kartu Jahit dari Finalisasi Gajian (permintaan
// Denny 2026-09) ──────────────────────────────────────────────────────────
// Latar: admin kadang kekurangan tangan utk jalanin papan Jahit manual
// (assign penjahit → geser On Progress → Ready Finishing → tandai Selesai)
// sampai kartu jadi terlewat/menumpuk. Tapi begitu Finance sudah mencatat
// GAJIAN Jahit (siapa kerjain kode apa berapa pcs) DAN Finishing kode yang
// sama sudah dicatat juga di periode yang sama, itu SUDAH cukup bukti kartu
// itu selesai — jadi papan Jahit disinkronkan otomatis saat Finalisasi,
// tanpa admin harus jalanin tiap langkah manual lagi. Pure logic di sini
// (dipanggil dari api.js syncJahitCardsFromGajian, I/O terpisah).

/**
 * buildJahitContributionsByKode — dari semua baris gaji_jahit SATU periode,
 * hitung kontribusi qty per kode × per karyawan (SEMUA warna/ukuran kartu
 * digabung jadi satu angka per kode — permintaan Denny eksplisit: "tidak
 * terlalu peduli terkait warna siapa penjahit yang mengerjakan, ikuti saja
 * angka yang dikerjakan penjahit"). Urutan kontribusi per kode mengikuti
 * urutan baris `jahitRows` (api.js query created_at asc) — dipakai
 * buildJahitCardSync utk menentukan siapa "menghabiskan" kartu duluan kalau
 * kode yg sama dikerjakan >1 penjahit.
 * @param {{karyawan_id, karyawan?: {nama}, kartu_items: {kode, jumlah}[]}[]} jahitRows
 * @returns {{ [kode]: {karyawanId, karyawanNama, qty}[] }}
 */
export function buildJahitContributionsByKode(jahitRows = []) {
  const byKode = {};
  for (const row of jahitRows) {
    const karyawanId = row.karyawan_id;
    const karyawanNama = row.karyawan?.nama ?? "—";
    const perKode = {};
    for (const item of row.kartu_items ?? []) {
      const kode = item.kode;
      const qty = Number(item.jumlah) || 0;
      if (!kode || qty <= 0) continue;
      perKode[kode] = (perKode[kode] ?? 0) + qty;
    }
    for (const [kode, qty] of Object.entries(perKode)) {
      if (!byKode[kode]) byKode[kode] = [];
      byKode[kode].push({ karyawanId, karyawanNama, qty });
    }
  }
  return byKode;
}

/**
 * buildJahitCardSync — tentukan kartu Jahit (jahit_cards, status != "done")
 * mana saja yang otomatis ditandai "selesai" + diisi nama penjahit, begitu
 * kode terbukti sudah dijahit (gaji_jahit) DAN sudah difinishing
 * (gaji_finishing) di periode yang sama.
 *
 * Aturan (dikonfirmasi Denny via pilihan Recommended saat ditanya):
 * - Kartu diurutkan PALING LAMA dibuat dulu — `cards` HARUS sudah diurutkan
 *   created_at ASC oleh caller (api.js) — kartu lama diselesaikan duluan.
 * - Total qty yg ditandai selesai = SEBANYAK angka yg tercatat di
 *   gaji_jahit utk kode ini (`contributions`). SISA kartu (mis. akibat
 *   reject/tidak jadi, atau memang belum sempat dijahit semua) DIBIARKAN
 *   apa adanya di papan Jahit — TIDAK dipaksa selesai, supaya reject tetap
 *   kelihatan/bisa ditelusuri, bukan hilang diam-diam.
 * - Kalau kode yg sama dikerjakan >1 penjahit, kartu diisi nama SESUAI
 *   URUTAN qty tiap penjahit (karyawan pertama "menghabiskan" kartu² awal
 *   sejumlah qty-nya, baru lanjut ke penjahit berikutnya) — TIDAK mencoba
 *   mencocokkan warna/ukuran kartu tertentu ke penjahit tertentu, murni
 *   ikuti angka (permintaan eksplisit Denny, "tidak peduli warna siapa").
 * - Satu kartu = satu unit ATOMIK (tidak dipecah lintas 2 penjahit) — kalau
 *   qty kartu melebihi sisa kuota penjahit saat ini, kartu itu TETAP
 *   sepenuhnya "milik" penjahit saat ini; penjahit berikutnya mulai dari
 *   kartu SETELAHNYA.
 *
 * @param {{contributions: {karyawanId, karyawanNama, qty}[], cards: {id, qty}[]}} args
 * @returns {{cardId, karyawanId, karyawanNama}[]}
 */
export function buildJahitCardSync({ contributions = [], cards = [] }) {
  const updates = [];
  let ci = 0;
  let remaining = contributions[0]?.qty ?? 0;
  for (const card of cards) {
    while (ci < contributions.length && remaining <= 0) {
      ci++;
      remaining = contributions[ci]?.qty ?? 0;
    }
    if (ci >= contributions.length) break;
    const k = contributions[ci];
    updates.push({ cardId: card.id, karyawanId: k.karyawanId, karyawanNama: k.karyawanNama });
    remaining -= Number(card.qty) || 0;
  }
  return updates;
}
