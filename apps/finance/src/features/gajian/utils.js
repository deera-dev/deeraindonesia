/**
 * utils.js — Pure helpers fitur Gajian (kalkulasi upah, rincian, teks WA).
 * Tidak ada React, tidak ada Supabase.
 */
import { fmtRp as fmtRpLocal, fmtTanggal } from "../../shared/lib/format";

export const TABS = ["Potong", "Jahit", "Finishing", "QC", "Kreatif", "CMT", "Ringkasan"];

export const JAHIT_MARKS = [20000, 23000, 25000, 30000, 35000];

export const newKartu = () => ({ kode: "", warna: "", ukuran: "", jumlah: "", upah: 20000 });
export const newPermak = () => ({ keterangan: "", jumlah: "", upah: "" });
export const newProduk = () => ({ kode_produk: "", nama_produk: "", jumlah: "", kancing_qty: "" });

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

/** Hitung total upah Tim Finishing. items: [{nama_produk, jumlah, kancing_qty}] */
export function calcUpahFinishing(items = [], cfg) {
  const tarifPcs = calcFinishingPerPcs(cfg);
  return items.reduce(
    (sum, item) => sum + (Number(item.jumlah) || 0) * tarifPcs + (Number(item.kancing_qty) || 0) * cfg.tarif_kancing,
    0,
  );
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
