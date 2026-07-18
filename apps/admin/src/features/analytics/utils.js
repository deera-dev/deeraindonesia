/**
 * features/analytics/utils.js
 * Pure helpers — tidak ada I/O, tidak ada agregasi/business logic (semua
 * SUM/COUNT/AVG/GROUP BY sudah dihitung di RPC Postgres, lihat api.js).
 * File ini HANYA formatting untuk tampilan.
 */
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import {
  DEFAULT_RANGE_DAYS,
  EXECUTIVE_MARGIN_HEALTHY_PCT,
  EXECUTIVE_MARGIN_WARNING_PCT,
  EXECUTIVE_RETURN_RATE_WARNING,
  EXECUTIVE_RETURN_RATE_RISK,
  EXECUTIVE_OPPORTUNITY_LIMIT,
  EXECUTIVE_RISK_LIMIT,
  EXECUTIVE_INSIGHT_MAX,
} from "./constants";

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// Singkat angka besar agar tidak overflow di KpiCard sempit.
// ≥ 1 M → "Rp 1,4 M"  |  ≥ 1 jt → "Rp 145,6 jt"  |  lainnya → fmtRp
export function fmtRpShort(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  return (sign ? "-" : "") + fmtRp(abs);
}

export function fmtNumber(n) {
  return (Number(n) || 0).toLocaleString("id-ID");
}

// Format rasio (0..1, mis. margin = profit/revenue) jadi persen 1 desimal —
// dipakai tab Products (marginTertinggi/marginTerendah). Rasio negatif
// tetap ditampilkan apa adanya (margin negatif = sinyal produk bermasalah,
// BUKAN dikosongkan/disembunyikan).
export function fmtPercent(n) {
  return (Number(n) || 0).toLocaleString("id-ID", { style: "percent", maximumFractionDigits: 1 });
}

// Format angka desimal (mis. qty per hari, hari cover) dengan maksimal N
// desimal, tanpa trailing zero berlebihan — dipakai tab Products
// (fastMoving/slowMoving/stokHampirHabis).
export function fmtDecimal(n, maxFractionDigits = 2) {
  return (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: maxFractionDigits });
}

// Field pct dari beberapa RPC (mis. Phase 6 Extension
// abcClassification.revenuePct, revenueConcentration.*, marketConcentration
// pct) SUDAH berupa angka persen (45.2 = 45,2%) langsung dari SQL
// (ROUND(...*100,1)) — BEDA dari fmtPercent() di atas yang mengharapkan
// fraksi 0..1. fmtPct1 murni menambah suffix "%", TIDAK ada kalkulasi.
// Duplikat SENGAJA dari helper lokal yang sama di AdvancedTab.jsx —
// konsisten dengan pola localDateStr() (lihat catatan di atas), dipakai
// juga oleh utils.js sendiri (buildExecutiveInsights/buildRecommendations)
// sehingga tidak bisa hanya lokal di 1 komponen.
export function fmtPct1(v) {
  return `${v}%`;
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Label periode pendek untuk sumbu chart — beradaptasi ke granularity
// supaya tidak menampilkan "2026-07-01" penuh untuk grafik tahunan.
export function fmtPeriode(periode, granularity) {
  if (!periode) return "-";
  const d = new Date(periode);
  if (granularity === "year") return d.toLocaleDateString("id-ID", { year: "numeric" });
  if (granularity === "month") return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/** Format Date → "YYYY-MM-DD" lokal (bukan UTC) — pola sama seperti
 * localDateStr() di packages/shared/lib/bepUtils.js dan
 * apps/pos/src/features/penjualan/hooks.js. Diduplikasi SENGAJA, bukan
 * di-import lintas modul — konsisten dengan pola yang sudah dipakai di
 * seluruh repo ini (lihat komentar serupa di bepUtils.js). */
export function localDateStr(d = new Date()) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// Hitung rentang tanggal N hari terakhir (termasuk hari ini), dipakai oleh
// defaultDateRange() DAN oleh preset Global Filter Bar (DATE_PRESETS di
// constants.js — 7 Hari/30 Hari/1 Tahun). Fungsi generik ini TIDAK
// mengandung business logic baru — murni kalkulasi tanggal murni yang
// SAMA persis dengan yang dulu hardcode 30 hari di defaultDateRange().
export function dateRangeForDays(days, today = new Date()) {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { fromDate: localDateStr(from), toDate: localDateStr(today) };
}

// Rentang default saat filter belum pernah diubah user: N hari terakhir
// (N = DEFAULT_RANGE_DAYS), berakhir hari ini. Sekarang murni wrapper tipis
// di atas dateRangeForDays() — dipertahankan supaya kode/test lama yang
// memanggil defaultDateRange() tidak perlu diubah.
export function defaultDateRange(today = new Date()) {
  return dateRangeForDays(DEFAULT_RANGE_DAYS, today);
}

// Selisih hari (bisa negatif = lewat jatuh tempo) dari hari ini ke
// `dateStr` — DIPINDAHKAN APA ADANYA dari features/produksi-laporan/
// utils.js (folder tsb dihapus). Dipakai tab Produksi (section Tagihan
// Jatuh Tempo) untuk badge status Lunas/Lewat/mendekati jatuh tempo.
export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

// ════════════════════════════════════════════════════════════════════════
// Phase 9 — Executive Dashboard: fungsi derivasi MURNI, frontend-only.
//
// PENTING (aturan eksplisit Denny — "JANGAN membuat analytics_executive(),
// Executive Dashboard HARUS menjadi AGREGATOR"): fungsi di bawah ini TIDAK
// melakukan SUM/AVG/COUNT/JOIN terhadap data mentah — SELURUH input SUDAH
// berupa angka FINAL yang datang dari RPC lain (analytics_overview,
// analytics_advanced, analytics_inventory, analytics_forecast, dst, lewat
// hooks.js -> useAnalyticsExecutive()). Yang dilakukan di sini HANYA:
//   1. Memilih (pick top-N dari array yang SUDAH diurutkan RPC-nya).
//   2. Membandingkan 2 angka yang sudah ada (mis. es forecast vs histori
//      terakhir) untuk menentukan arah naik/turun.
//   3. Mengklasifikasi 1 angka yang sudah ada terhadap threshold TETAP
//      (constants.js) menjadi status warna hijau/kuning/merah.
//   4. Menyusun kalimat template dari angka-angka di atas.
// TIDAK ADA metric baru yang "dikarang" — kalau data yang dibutuhkan
// sebuah insight/section tidak tersedia (lihat catatan
// "buildExecutiveInsights" di bawah), insight tsb TIDAK disertakan, bukan
// diisi kira-kira.
// ════════════════════════════════════════════════════════════════════════

// Klasifikasi margin portfolio (advanced.kpi.overallMarginPct, fraksi 0..1)
// jadi status warna — threshold di constants.js, HEURISTIK bisnis (bukan
// baku universal).
export function classifyMarginHealth(overallMarginPct) {
  const v = Number(overallMarginPct) || 0;
  if (v >= EXECUTIVE_MARGIN_HEALTHY_PCT) return "green";
  if (v >= EXECUTIVE_MARGIN_WARNING_PCT) return "yellow";
  return "red";
}

// Klasifikasi return rate (advanced.kpi.returnRate, fraksi 0..1) jadi
// status warna — threshold di constants.js.
export function classifyReturnRateHealth(returnRate) {
  const v = Number(returnRate) || 0;
  if (v >= EXECUTIVE_RETURN_RATE_RISK) return "red";
  if (v >= EXECUTIVE_RETURN_RATE_WARNING) return "yellow";
  return "green";
}

// Klasifikasi arah revenue MoM (advanced.periodComparison.mom.pctChange)
// jadi status warna. `null` (histori belum cukup 2 bulan penuh — lihat
// migration Phase 6) SENGAJA "yellow" (netral/tidak diketahui), BUKAN
// hijau atau merah yang menyiratkan kepastian arah yang tidak ada.
export function classifyRevenueTrendHealth(pctChange) {
  if (pctChange == null) return "yellow";
  if (pctChange > 0) return "green";
  if (pctChange < 0) return "red";
  return "yellow";
}

// Section 2 — Business Health: daftar {status, label, detail}. Input SUDAH
// berupa angka final (momPctChange dari advanced.periodComparison.mom,
// overallMarginPct/returnRate dari advanced.kpi, deadStockCount/
// overstockCount dari inventory.stockHealth) — fungsi ini HANYA
// mengklasifikasi + memformat teks, TIDAK menghitung ulang.
export function buildBusinessHealth({ momPctChange, overallMarginPct, returnRate, deadStockCount, overstockCount }) {
  const items = [
    {
      status: classifyRevenueTrendHealth(momPctChange),
      label: "Penjualan (Bulan ke Bulan)",
      detail:
        momPctChange == null
          ? "Data belum cukup (perlu 2 bulan penuh riwayat)"
          : `${momPctChange > 0 ? "Naik" : momPctChange < 0 ? "Turun" : "Stabil"} ${Math.abs(momPctChange)}%`,
    },
    {
      // Label SENGAJA "Status Keuntungan" (bukan "Persentase Keuntungan" —
      // itu label KpiCard di section "Kondisi Bisnis Hari Ini" di halaman
      // yang SAMA). UX Audit 2026-07: dua label identik utk section
      // berbeda di halaman yang sama = duplikasi. KpiCard menjawab "berapa
      // persennya", baris ini menjawab "apakah itu sehat" (dot hijau/
      // kuning/merah) — informasi BERBEDA meski angkanya sama, jadi
      // dibedakan namanya supaya tidak terbaca sebagai pengulangan.
      status: classifyMarginHealth(overallMarginPct),
      label: "Status Keuntungan",
      detail: fmtPercent(overallMarginPct),
    },
    {
      status: classifyReturnRateHealth(returnRate),
      label: "Tingkat Retur",
      detail: fmtPercent(returnRate),
    },
  ];
  if (deadStockCount > 0) {
    items.push({ status: "yellow", label: "Stok Tidak Bergerak", detail: `${deadStockCount} produk belum pernah terjual` });
  }
  if (overstockCount > 0) {
    items.push({ status: "yellow", label: "Stok Berlebih", detail: `${overstockCount} produk kelebihan stok` });
  }
  return items;
}

// Section 4 — Biggest Opportunity: dari forecast.restockForecast (SUDAH
// berisi forecastedDemandNextPeriod + currentStock + suggestedOrderQty per
// produk, dan SUDAH difilter RPC hanya produk dengan forecast valid).
// Diurutkan DI SINI berdasarkan suggestedOrderQty (sortir tampilan murni,
// BUKAN kalkulasi baru — setiap angka yang dipakai sudah final dari RPC)
// supaya opportunity TERBESAR muncul dulu.
//
// KETERBATASAN (jangan mengarang): "market berkembang" (contoh roadmap)
// TIDAK disertakan — tidak ada field growth/trend PER MARKET di RPC
// manapun saat ini (marketConcentration hanya snapshot 1 periode, bukan
// perbandingan), jadi opportunity di sini HANYA dari sisi demand produk.
export function buildBiggestOpportunity(restockForecast, limit = EXECUTIVE_OPPORTUNITY_LIMIT) {
  return [...restockForecast]
    .sort((a, b) => (b.suggestedOrderQty ?? 0) - (a.suggestedOrderQty ?? 0))
    .slice(0, limit)
    .map((r) => ({
      kode: r.kode,
      detail: `Demand ${r.forecastedDemandNextPeriod} pcs, stok ${r.currentStock} pcs — sarankan order ${r.suggestedOrderQty} pcs`,
    }));
}

// Section 5 — Biggest Risk: gabungan dead stock (inventory) + margin
// negatif (advanced) — DUA sumber berbeda digabung jadi SATU daftar
// gabungan (murni penggabungan array + rename field utk tampilan seragam,
// BUKAN kalkulasi baru), dipotong ke `limit` teratas.
export function buildBiggestRisk({ deadStock, negativeMarginProducts }, limit = EXECUTIVE_RISK_LIMIT) {
  const fromDeadStock = deadStock.map((d) => ({
    kode: d.kode,
    category: "Stok Tidak Bergerak",
    detail: "Belum pernah terjual",
  }));
  const fromMargin = negativeMarginProducts.map((m) => ({
    kode: m.kode,
    category: "Margin Negatif",
    detail: `${fmtDecimal(m.marginPct)}% (jual rugi)`,
  }));
  return [...fromDeadStock, ...fromMargin].slice(0, limit);
}

// Bandingkan forecast ES terhadap titik histori TERAKHIR (2 angka yang
// SUDAH ada di `forecast.<x>Forecast`) — HANYA arah naik/turun/stabil,
// BUKAN kalkulasi metric baru. Diekspor (BUKAN lagi private) sejak
// Redesign UI/UX 2026-07 — dipakai juga oleh buildPrioritizedQuickActions()
// di bawah (Tindakan Prioritas "Rendah": perkiraan permintaan meningkat),
// bukan cuma buildExecutiveInsights().
export function trendDirection(history, es) {
  if (es == null || !history.length) return null;
  const last = history[history.length - 1]?.value;
  if (last == null) return null;
  if (es > last) return "naik";
  if (es < last) return "turun";
  return "stabil";
}

// Section 6 — Executive Insight: SETIAP baris hanya disertakan kalau data
// pendukungnya BENAR-BENAR ada (lihat komentar per kondisi) — TIDAK
// dipaksakan sampai EXECUTIVE_INSIGHT_MAX kalau datanya tidak mencukupi.
export function buildExecutiveInsights({ overview, advanced, inventory, forecast }) {
  const insights = [];

  // 1. Revenue MoM — hanya kalau data cukup (lihat classifyRevenueTrendHealth).
  const mom = advanced.periodComparison.mom;
  if (mom) {
    insights.push(
      `Penjualan bulan lalu ${mom.pctChange > 0 ? "naik" : mom.pctChange < 0 ? "turun" : "stabil"} ${Math.abs(mom.pctChange)}% dibanding bulan sebelumnya (${fmtRpShort(mom.previousRevenue)} → ${fmtRpShort(mom.currentRevenue)}).`,
    );
  }

  // 2. Margin portfolio — SELALU ada (kpi.overallMarginPct default 0, valid
  // untuk dilaporkan apa adanya walau 0).
  insights.push(`Persentase keuntungan keseluruhan saat ini ${fmtPercent(advanced.kpi.overallMarginPct)}.`);

  // 3. Pasar terbaik — hanya kalau ada transaksi (quickInsight.pasarTerbaik
  // bisa null kalau belum ada revenue sama sekali pada periode filter).
  if (overview.quickInsight.pasarTerbaik) {
    insights.push(`Cabang ${LOCATION_LABELS[overview.quickInsight.pasarTerbaik.location] ?? overview.quickInsight.pasarTerbaik.location} menjadi penyumbang penjualan tertinggi periode ini.`);
  }

  // 4. Produk terlaris — sama, bisa null kalau belum ada penjualan.
  if (overview.quickInsight.produkTerlaris) {
    insights.push(`${overview.quickInsight.produkTerlaris.kode} adalah produk terlaris periode ini.`);
  }

  // 5. Dead stock — hanya kalau > 0 (kalau 0, tidak ada yang perlu
  // dilaporkan, bukan "insight" yang berguna).
  if (inventory.stockHealth.dead > 0) {
    insights.push(`Ada ${inventory.stockHealth.dead} produk yang belum pernah terjual (stok tidak bergerak).`);
  }

  // 6. Return rate — hanya diangkat jadi insight kalau di atas ambang
  // wajar (WARNING threshold), supaya tidak membanjiri insight dengan
  // angka yang sebenarnya sehat.
  if (advanced.kpi.returnRate >= EXECUTIVE_RETURN_RATE_WARNING) {
    insights.push(`Tingkat retur ${fmtPercent(advanced.kpi.returnRate)} — di atas ambang wajar, ${fmtRpShort(advanced.kpi.returnRevenueImpact)} penjualan hilang karena retur.`);
  }

  // 7. Forecast revenue — hanya kalau ES tersedia (histori >= 2 periode,
  // lihat migration Phase 8) DAN ada titik histori untuk dibandingkan.
  const revenueTrend = trendDirection(forecast.revenueForecast.history, forecast.revenueForecast.es);
  if (revenueTrend) {
    insights.push(`Perkiraan penjualan periode berikutnya cenderung ${revenueTrend} (berdasarkan tren terbaru).`);
  }

  // 8. Margin negatif — hanya kalau > 0.
  if (advanced.marginRisk.negativeMarginProducts.length > 0) {
    insights.push(`Ada ${advanced.marginRisk.negativeMarginProducts.length} produk yang terjual rugi (persentase keuntungan negatif).`);
  }

  // 9. Konsentrasi revenue — SELALU ada (revenueConcentration default 0,
  // valid dilaporkan apa adanya).
  insights.push(`5 produk teratas menyumbang ${fmtPct1(advanced.revenueConcentration.top5Pct)} dari total penjualan.`);

  // 10. New vs Returning — hanya kalau ada revenue pelanggan bernama sama
  // sekali (new + returning > 0), supaya tidak melaporkan "Rp 0 vs Rp 0"
  // yang tidak informatif.
  if (advanced.newVsReturning.newRevenue + advanced.newVsReturning.returningRevenue > 0) {
    insights.push(`Penjualan dari pelanggan baru ${fmtRpShort(advanced.newVsReturning.newRevenue)}, pelanggan lama ${fmtRpShort(advanced.newVsReturning.returningRevenue)}.`);
  }

  return insights.slice(0, EXECUTIVE_INSIGHT_MAX);
}

// Section 7 — Recommendation: template teks dari angka yang SUDAH ada,
// pola SAMA dengan buildExecutiveInsights (hanya disertakan kalau
// relevan/data mendukung, TIDAK dipaksakan).
export function buildRecommendations({ advanced, inventory, forecast }) {
  const recs = [];

  if (inventory.suggestedRestock.length > 0) {
    const kodes = inventory.suggestedRestock.slice(0, 3).map((r) => r.kode).join(", ");
    recs.push(`Restock produk: ${kodes}${inventory.suggestedRestock.length > 3 ? ", dan lainnya" : ""}.`);
  }

  if (advanced.marginRisk.negativeMarginProducts.length > 0) {
    const kodes = advanced.marginRisk.negativeMarginProducts.slice(0, 3).map((m) => m.kode).join(", ");
    recs.push(`Evaluasi harga/modal produk yang terjual rugi: ${kodes}.`);
  }

  if (inventory.stockHealth.overstock > 0) {
    const kodes = inventory.overstock.slice(0, 3).map((o) => o.kode).join(", ");
    recs.push(`Kurangi/tunda produksi produk stok berlebih: ${kodes || `${inventory.stockHealth.overstock} produk`}.`);
  }

  if (advanced.marketConcentration.length > 0) {
    const top = [...advanced.marketConcentration].sort((a, b) => b.value - a.value)[0];
    if (top) recs.push(`Fokuskan promosi di cabang ${LOCATION_LABELS[top.location] ?? top.location} (kontribusi penjualan tertinggi, ${fmtPct1(top.pct)}).`);
  }

  if (forecast.restockForecast.length > 0) {
    const kodes = forecast.restockForecast.slice(0, 3).map((r) => r.kode).join(", ");
    recs.push(`Siapkan stok untuk perkiraan permintaan periode berikutnya: ${kodes}.`);
  }

  return recs;
}

// ════════════════════════════════════════════════════════════════════════
// Redesign UI/UX (2026-07) — Ringkasan Bisnis (dulu ExecutiveTab): Tindakan
// Prioritas diurutkan Tinggi/Sedang/Rendah (instruksi eksplisit Denny,
// "Quick Action harus benar-benar membantu owner menentukan tindakan
// berikutnya, urutkan berdasarkan tingkat urgensi").
//
// SAMA seperti seluruh fungsi Phase 9 lain di atas — INI BUKAN business
// logic baru. Seluruh angka input (restockCount, criticalStockCount, dst)
// SUDAH final dari RPC (analytics_inventory/analytics_advanced/
// analytics_forecast via hooks.js) — fungsi ini HANYA mengelompokkan
// angka yang sudah ada ke 3 keranjang prioritas TETAP (bukan threshold
// baru yang dihitung), lalu menyusun kalimat template. Kalau seluruh
// keranjang kosong, artinya TIDAK ADA tindakan mendesak — komponen
// (ExecutiveTab.jsx) menampilkan pesan itu secara eksplisit, BUKAN
// mengarang tindakan supaya section terlihat "terisi".
export function buildPrioritizedQuickActions({
  restockCount,
  restockKodes = [],
  criticalStockCount,
  negativeMarginCount,
  lowStockCount,
  deadStockCount,
  demandTrend,
  revenueMomPctChange,
}) {
  const tinggi = [];
  const sedang = [];
  const rendah = [];

  // ── Prioritas Tinggi — butuh tindakan segera (stok/uang langsung terdampak) ──
  if (restockCount > 0) {
    tinggi.push({
      label: `${restockCount} produk perlu segera ditambah stoknya.`,
      detail: restockKodes.length ? `Termasuk: ${restockKodes.join(", ")}.` : null,
    });
  }
  if (criticalStockCount > 0) {
    tinggi.push({
      label: `${criticalStockCount} produk stoknya kritis, hampir habis.`,
      detail: null,
    });
  }
  if (negativeMarginCount > 0) {
    tinggi.push({
      label: `${negativeMarginCount} produk terjual di bawah harga modal (rugi).`,
      detail: null,
    });
  }

  // ── Prioritas Sedang — perlu diperhatikan, belum darurat ──
  if (lowStockCount > 0) {
    sedang.push({ label: `${lowStockCount} produk stoknya mulai menipis.`, detail: null });
  }
  if (deadStockCount > 0) {
    sedang.push({ label: `${deadStockCount} produk sudah lama tidak terjual sama sekali.`, detail: null });
  }

  // ── Prioritas Rendah — kabar baik/peluang, tidak butuh tindakan darurat ──
  if (demandTrend === "naik") {
    rendah.push({ label: "Perkiraan permintaan produk meningkat pada periode berikutnya.", detail: null });
  }
  if (revenueMomPctChange != null && revenueMomPctChange > 0) {
    rendah.push({ label: `Penjualan naik ${revenueMomPctChange}% dibanding bulan sebelumnya.`, detail: null });
  }

  return { tinggi, sedang, rendah };
}
