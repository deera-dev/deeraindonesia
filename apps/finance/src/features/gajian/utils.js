import { fmtRp as fmtRpLocal, fmtTanggal } from "../../shared/lib/format";

export const TABS = [
  "Potong",
  "Jahit",
  "Finishing",
  "QC",
  "Kreatif",
  "CMT",
  "Tambahan",
  "Ringkasan",
];

export const JAHIT_MARKS = [20000, 23000, 25000, 30000, 35000];

export const newKartu = () => ({ kode: "", warna: "", ukuran: "", jumlah: "", upah: 20000 });
export const newPermak = () => ({ keterangan: "", jumlah: "", upah: "" });

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isBlankKartu(it) {
  return !it.kode && !it._o?.kode && !it.jumlah && !it._o?.jumlah;
}

export function parseJahitQr(text) {
  const match = String(text ?? "").match(UUID_RE);
  return match ? match[0] : null;
}
export const newProduk = () => ({
  kode_produk: "",
  nama_produk: "",
  jumlah: "",
  kancing_per_pcs: "",
  pakai_lubang: false,
  lubang_per_pcs: "",
});

export function calcUpahPotong(
  { jumlah_pola = 0, jumlah_sampel = 0, qty_potongan = 0, tarif_potongan = 4000 },
  cfg,
) {
  return (
    jumlah_pola * cfg.tarif_pola + jumlah_sampel * cfg.tarif_sampel + qty_potongan * tarif_potongan
  );
}

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

export function calcKancingQty(jumlah, kancingPerPcs) {
  return (Number(jumlah) || 0) * (Number(kancingPerPcs) || 0);
}

export function deriveKancingPerPcs(oldItem) {
  if (!oldItem) return 0;
  if (
    oldItem.kancing_per_pcs !== undefined &&
    oldItem.kancing_per_pcs !== null &&
    oldItem.kancing_per_pcs !== ""
  ) {
    return Number(oldItem.kancing_per_pcs) || 0;
  }
  const oldJumlah = Number(oldItem.jumlah) || 0;
  const oldKancing = Number(oldItem.kancing_qty) || 0;
  return oldJumlah > 0 ? oldKancing / oldJumlah : 0;
}

export function calcLubangQty(jumlah, lubangPerPcs, pakaiLubang) {
  if (!pakaiLubang) return 0;
  return (Number(jumlah) || 0) * (Number(lubangPerPcs) || 0);
}

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

export function sumFinishingItemsJumlah(items = []) {
  return items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
}

export function autoSelectIfSingle(options = []) {
  const valid = (options ?? []).filter(Boolean);
  return valid.length === 1 ? valid[0] : "";
}

export function calcUpahKreatif({ jumlah_video = 0, jumlah_foto = 0, jumlah_logo = 0 }, cfg) {
  return (
    jumlah_video * cfg.tarif_video + jumlah_foto * cfg.tarif_foto + jumlah_logo * cfg.tarif_logo
  );
}

export function rincianPotong(r, cfg) {
  const out = [];
  const jp = Number(r.jumlah_pola) || 0;
  const js = Number(r.jumlah_sampel) || 0;
  const qp = Number(r.qty_potongan) || 0;
  const tp = Number(r.tarif_potongan) || 0;
  if (jp > 0)
    out.push({ label: `${jp} pola × ${fmtRpLocal(cfg.tarif_pola)}`, sub: jp * cfg.tarif_pola });
  if (js > 0)
    out.push({
      label: `${js} sampel × ${fmtRpLocal(cfg.tarif_sampel)}`,
      sub: js * cfg.tarif_sampel,
    });
  if (qp > 0) out.push({ label: `${qp} pcs potong × ${fmtRpLocal(tp)}`, sub: qp * tp });
  const manual =
    (Number(r.total_upah) || 0) - (jp * cfg.tarif_pola + js * cfg.tarif_sampel + qp * tp);
  if (manual !== 0) out.push({ label: "Tambahan manual", sub: manual });
  return out;
}

export function rincianJahit(r) {
  const out = [];
  for (const it of r.kartu_items ?? []) {
    const jml = Number(it.jumlah) || 0;
    const upah = Number(it.upah) || 0;
    if (jml <= 0) continue;
    const ket = [it.kode, it.ukuran, it.warna].filter(Boolean).join(" · ");
    out.push({
      label: `${jml} pcs${ket ? ` (${ket})` : ""} × ${fmtRpLocal(upah)}`,
      sub: jml * upah,
    });
  }
  for (const it of r.permak_items ?? []) {
    const jml = Number(it.jumlah) || 0;
    const upah = Number(it.upah) || 0;
    if (jml <= 0) continue;
    out.push({
      label: `Permak${it.keterangan ? ` ${it.keterangan}` : ""} ${jml} × ${fmtRpLocal(upah)}`,
      sub: jml * upah,
    });
  }
  return out;
}

export function rincianKreatif(r, cfg) {
  const out = [];
  const v = Number(r.jumlah_video) || 0;
  const f = Number(r.jumlah_foto) || 0;
  const l = Number(r.jumlah_logo) || 0;
  if (v > 0)
    out.push({ label: `${v} video × ${fmtRpLocal(cfg.tarif_video)}`, sub: v * cfg.tarif_video });
  if (f > 0)
    out.push({ label: `${f} foto seri × ${fmtRpLocal(cfg.tarif_foto)}`, sub: f * cfg.tarif_foto });
  if (l > 0)
    out.push({ label: `${l} logo × ${fmtRpLocal(cfg.tarif_logo)}`, sub: l * cfg.tarif_logo });
  const manual =
    (Number(r.total_upah) || 0) - (v * cfg.tarif_video + f * cfg.tarif_foto + l * cfg.tarif_logo);
  if (manual !== 0) out.push({ label: "Tambahan manual", sub: manual });
  return out;
}

export function rincianQC(r, cfg) {
  const out = [];
  const pcs = Number(r.jumlah_pcs) || 0;
  if (pcs > 0)
    out.push({ label: `${pcs} pcs QC × ${fmtRpLocal(cfg.tarif_qc)}`, sub: pcs * cfg.tarif_qc });
  const manual = (Number(r.total_upah) || 0) - pcs * cfg.tarif_qc;
  if (manual !== 0) out.push({ label: "Tambahan manual", sub: manual });
  return out;
}

export function buildPerKaryawanMap({
  potong = [],
  jahit = [],
  qc = [],
  kreatif = [],
  cfg,
  includeQC = false,
}) {
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

export function sumTambahan(tambahan = []) {
  return tambahan.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
}

export function sumKasbonDeduction(kasbon = [], kasbonDeds = {}) {
  return kasbon.reduce((s, kb) => s + Math.min(Number(kasbonDeds[kb.id]) || 0, kb.sisa), 0);
}

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

export function cleanTambahan(tambahan = []) {
  return tambahan.filter((it) => it.label || it.jumlah);
}

export const BELI_GAS_LABEL = "Beli Gas";
export const BELI_GAS_AMOUNT = 100000;
export const PERSIAPAN_ATK_LABEL = "Persiapan ATK";

export function findTambahanByLabel(tambahan = [], label) {
  return tambahan.find((t) => t.label === label) ?? null;
}

export function otherTambahan(tambahan = []) {
  return tambahan.filter((t) => t.label !== BELI_GAS_LABEL && t.label !== PERSIAPAN_ATK_LABEL);
}

export function buildTambahanPayload({ otherItems = [], beliGasEnabled = false, atkJumlah = 0 }) {
  const out = [...otherItems];
  if (beliGasEnabled) out.push({ label: BELI_GAS_LABEL, jumlah: BELI_GAS_AMOUNT });
  const atk = Number(atkJumlah) || 0;
  if (atk > 0) out.push({ label: PERSIAPAN_ATK_LABEL, jumlah: atk });
  return out;
}

export function pettycashTerpakaiFromSaldo(saldo) {
  const s = Number(saldo) || 0;
  return s < 0 ? -s : 0;
}

export function calcTotalRequest({
  totalGaji = 0,
  pettycash = 0,
  tambahan = [],
  kasbon = [],
  kasbonDeds = {},
}) {
  return (
    totalGaji +
    (Number(pettycash) || 0) +
    sumTambahan(tambahan) -
    sumKasbonDeduction(kasbon, kasbonDeds)
  );
}

export function buildRequestBreakdown(g = {}) {
  const gaji = Number(g.total_gaji) || 0;
  const pettycash = Number(g.pettycash) || 0;
  const tambahan = sumTambahan(g.tambahan ?? []);
  const kasbon = (g.kasbon_deductions ?? []).reduce((s, k) => s + (Number(k.jumlah) || 0), 0);
  const request = Number(g.total_request) || 0;
  const parts = [
    { key: "pettycash", label: "Petty Cash", sign: "+", value: pettycash },
    { key: "tambahan", label: "Tambahan", sign: "+", value: tambahan },
    { key: "kasbon", label: "Potongan Kasbon", sign: "−", value: kasbon },
  ].filter((p) => p.value > 0);
  return { gaji, pettycash, tambahan, kasbon, request, parts, selisih: request - gaji };
}

export function generateWAText({
  gajian,
  totals,
  perKaryawan,
  tambahan,
  pettycash,
  kasbonDeds,
  totalRequest,
}) {
  const fmtRp = fmtRpLocal;
  const isFinal = gajian.status === "final";
  const totalGaji = isFinal ? (gajian.total_gaji ?? 0) : (totals?.gaji ?? 0);
  const pc = isFinal ? (gajian.pettycash ?? 0) : Number(pettycash) || 0;
  const tambs = ((isFinal ? gajian.tambahan : tambahan) ?? []).filter((t) => Number(t.jumlah) > 0);
  const kasbs = ((isFinal ? gajian.kasbon_deductions : kasbonDeds) ?? []).filter(
    (k) => Number(k.jumlah) > 0,
  );
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

  const lines = [];
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
    for (const k of kasbs)
      lines.push(`− ${pad("Kasbon " + (k.nama || ""), 12)}: −${fmtRp(k.jumlah)}`);
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

export function stokTotalFor(stokRows, size, warna) {
  const row = (stokRows ?? []).find((r) => r.size === size && r.warna === warna);
  if (!row) return 0;
  return (Number(row.gudang) || 0) + (Number(row.cideng) || 0) + (Number(row.tegalgubug) || 0);
}

export function soldQtyFor(soldRows, size, warna) {
  return (soldRows ?? []).find((r) => r.size === size && r.warna === warna)?.qty ?? 0;
}

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

export function recalcReconciliationRow(row, soldRows, stokRows) {
  return buildReconciliationRow({ ...row, soldRows, stokRows });
}

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

export function buildManualRowsFromLog(kode, logRows = []) {
  const seen = new Set();
  const rows = [];
  for (const log of logRows) {
    const key = `${log.size}__${log.warna}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      newManualReconciliationRow(kode, {
        size: log.size,
        warna: log.warna,
        placeholder: log.qty_kartu ?? 0,
      }),
    );
  }
  return rows;
}

export function pickPendingCards(cards = [], jumlah = 0) {
  const pending = cards.filter((c) => !(c.stok_masuk_log ?? []).length);
  const batches = [];
  for (const c of pending) {
    let b = batches.find((x) => x.id === c.batch_id);
    if (!b) {
      b = { id: c.batch_id, latest: c.created_at ?? "", cards: [] };
      batches.push(b);
    }
    b.cards.push(c);
    if ((c.created_at ?? "") > b.latest) b.latest = c.created_at;
  }
  if (batches.length === 0) return [];
  batches.sort((a, b) => (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : 0));
  const target = Number(jumlah) || 0;
  let sum = 0;
  const picked = [];
  for (const b of batches) {
    picked.push(...b.cards);
    sum += b.cards.reduce((s, c) => s + (Number(c.qty) || 0), 0);
    if (sum === target) return picked;
    if (sum > target) break;
  }
  return batches[0].cards;
}

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
    soldRows: soldRows ?? [],
    stokRows: stokRows ?? [],
  };
}

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
