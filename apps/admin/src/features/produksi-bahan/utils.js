/**
 * utils.js — Pure helpers untuk fitur Bahan Baku (pembelian, pinjam, stok).
 */

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtDateShort(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function addFourMonths(dateStr) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 4);
  return d.toISOString().split("T")[0];
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

export const inputCls =
  "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";

export const labelCls =
  "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

export const TABS = [
  { key: "pembelian", label: "Pembelian" },
  { key: "pinjam", label: "Pinjam" },
  { key: "stok", label: "Stok Bahan" },
];

// ── Tagihan per Bulan + Share WA ───────────────────────────────────────────

export function fmtBulan(dateStr) {
  if (!dateStr) return "—";
  const [y, m] = dateStr.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${names[Number(m) - 1]} ${y}`;
}

export function fmtTanggalLengkap(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Harga per satuan (yard/meter/dst) efektif untuk satu baris pembelian —
 * pakai r.harga_satuan langsung kalau ada (nilai kanonikal yang tersimpan
 * saat input, lihat PembelianBulkForm.jsx), fallback ke hasil bagi
 * total_harga/jumlah kalau record lama tidak punya harga_satuan (permintaan
 * Denny 2026-08: "saya mau ada info harga per yard dikali dengan total
 * yard, jadi keliatan totalnya").
 */
export function hargaSatuanEfektif(r) {
  if (r?.harga_satuan != null) return r.harga_satuan;
  const jumlah = Number(r?.jumlah) || 0;
  if (!jumlah) return 0;
  return Math.round((Number(r?.total_harga) || 0) / jumlah);
}

/**
 * Group tagihan per bulan jatuh_tempo, filter by status_bayar.
 * `status` default "belum" (perilaku lama, dipakai TagihanBulanPanel utk
 * tagihan yg belum dibayar). Dipakai juga dgn status="lunas" utk panel
 * "Riwayat Lunas" (permintaan Denny 2026-08: "bahan yang udh lunas, lihat
 * tagihannya dimana ya? ga ada tempat buat lihat tagihan sebelumnya, yang
 * sudah lunas").
 */
export function groupTagihanPerBulan(items, status = "belum") {
  const filtered = items.filter((r) => r.status_bayar === status && r.jatuh_tempo);
  const map = {};
  for (const r of filtered) {
    const bulanKey = r.jatuh_tempo.slice(0, 7); // "YYYY-MM"
    if (!map[bulanKey]) map[bulanKey] = { bulan: bulanKey, total: 0, items: [] };
    map[bulanKey].total += r.total_harga ?? 0;
    map[bulanKey].items.push(r);
  }
  return Object.values(map).sort((a, b) => a.bulan.localeCompare(b.bulan));
}

export function generateTagihanWA(groups) {
  if (!groups.length) return "Tidak ada tagihan yang belum lunas.";
  const sep = "━━━━━━━━━━━━━━━━━━━";
  const fmtRpWA = (n) => "Rp " + Number(n).toLocaleString("id-ID");

  let lines = [];
  lines.push("*🧾 TAGIHAN BAHAN BAKU — DEERA*");
  lines.push(sep);
  lines.push("");

  for (const g of groups) {
    lines.push(`*📅 Jatuh Tempo: ${fmtBulan(g.bulan + "-01")}*`);
    for (const r of g.items) {
      lines.push(`  • ${r.nama_bahan}${r.motif ? " / " + r.motif : ""}`);
      // Qty TIDAK diulang di baris "Beli" — sudah ada di baris harga×qty di
      // bawah (permintaan Denny 2026-08: "600 yard diatas redundant karena
      // udah ada info dibawahnya harga x yard"). Beli & Tempo digabung satu baris.
      lines.push(`    Beli: ${fmtTanggalLengkap(r.tanggal)} · Tempo: ${fmtTanggalLengkap(r.jatuh_tempo)}`);
      lines.push(`    ${fmtRpWA(hargaSatuanEfektif(r))}/${r.satuan} × ${r.jumlah} ${r.satuan}`);
      lines.push(`    *${fmtRpWA(r.total_harga)}*`);
    }
    lines.push(`  ${sep}`);
    lines.push(`  *Total ${fmtBulan(g.bulan + "-01")}: ${fmtRpWA(g.total)}*`);
    lines.push("");
  }

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  lines.push(sep);
  lines.push(`*TOTAL SEMUA TAGIHAN: ${fmtRpWA(grandTotal)}*`);
  lines.push("");
  lines.push("_Deera Indonesia_");
  return lines.join("\n");
}

// ── Filter & agregasi daftar (dipakai ProduksiBahanPage) ───────────────────

export function filterBahanItems(items, filterStatus, search) {
  const q = search.toLowerCase();
  return items.filter((item) => {
    const matchStatus = filterStatus === "semua" || item.status_bayar === filterStatus;
    const matchSearch =
      !q ||
      (item.nama_bahan ?? "").toLowerCase().includes(q) ||
      (item.kode_bahan ?? "").toLowerCase().includes(q) ||
      (item.nama_pemberi ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
}

export function sumBelumLunas(items) {
  return items
    .filter((r) => r.status_bayar === "belum")
    .reduce((s, r) => s + (r.total_harga ?? 0), 0);
}

export function findRelatedPinjamRows(items, clicked) {
  const related = items.filter(
    (r) => r.nama_pemberi === clicked.nama_pemberi
  );
  return related.length > 0 ? related : [clicked];
}
