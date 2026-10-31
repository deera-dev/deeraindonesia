import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import {
  DEFAULT_RANGE_DAYS,
  EXECUTIVE_INSIGHT_MAX,
  EXECUTIVE_MARGIN_HEALTHY_PCT,
  EXECUTIVE_MARGIN_WARNING_PCT,
  EXECUTIVE_OPPORTUNITY_LIMIT,
  EXECUTIVE_RETURN_RATE_RISK,
  EXECUTIVE_RETURN_RATE_WARNING,
  EXECUTIVE_RISK_LIMIT,
} from "./constants";

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtRpShort(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000)
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  return (sign ? "-" : "") + fmtRp(abs);
}

export function fmtNumber(n) {
  return (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtPercent(n) {
  return (Number(n) || 0).toLocaleString("id-ID", { style: "percent", maximumFractionDigits: 1 });
}

export function fmtDecimal(n, maxFractionDigits = 2) {
  return (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: maxFractionDigits });
}

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

export function fmtPeriode(periode, granularity) {
  if (!periode) return "-";
  const d = new Date(periode);
  if (granularity === "year") return d.toLocaleDateString("id-ID", { year: "numeric" });
  if (granularity === "month")
    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
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

export function dateRangeForDays(days, today = new Date()) {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { fromDate: localDateStr(from), toDate: localDateStr(today) };
}

export function defaultDateRange(today = new Date()) {
  return dateRangeForDays(DEFAULT_RANGE_DAYS, today);
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

export function classifyMarginHealth(overallMarginPct) {
  const v = Number(overallMarginPct) || 0;
  if (v >= EXECUTIVE_MARGIN_HEALTHY_PCT) return "green";
  if (v >= EXECUTIVE_MARGIN_WARNING_PCT) return "yellow";
  return "red";
}

export function classifyReturnRateHealth(returnRate) {
  const v = Number(returnRate) || 0;
  if (v >= EXECUTIVE_RETURN_RATE_RISK) return "red";
  if (v >= EXECUTIVE_RETURN_RATE_WARNING) return "yellow";
  return "green";
}

export function classifyRevenueTrendHealth(pctChange) {
  if (pctChange == null) return "yellow";
  if (pctChange > 0) return "green";
  if (pctChange < 0) return "red";
  return "yellow";
}

export function buildBusinessHealth({
  momPctChange,
  overallMarginPct,
  returnRate,
  deadStockCount,
  overstockCount,
}) {
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
    items.push({
      status: "yellow",
      label: "Stok Tidak Bergerak",
      detail: `${deadStockCount} produk belum pernah terjual`,
    });
  }
  if (overstockCount > 0) {
    items.push({
      status: "yellow",
      label: "Stok Berlebih",
      detail: `${overstockCount} produk kelebihan stok`,
    });
  }
  return items;
}

export function buildBiggestOpportunity(restockForecast, limit = EXECUTIVE_OPPORTUNITY_LIMIT) {
  return [...restockForecast]
    .sort((a, b) => (b.suggestedOrderQty ?? 0) - (a.suggestedOrderQty ?? 0))
    .slice(0, limit)
    .map((r) => ({
      kode: r.kode,
      detail: `Demand ${r.forecastedDemandNextPeriod} pcs, stok ${r.currentStock} pcs — sarankan order ${r.suggestedOrderQty} pcs`,
    }));
}

export function buildBiggestRisk(
  { deadStock, negativeMarginProducts },
  limit = EXECUTIVE_RISK_LIMIT,
) {
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

export function trendDirection(history, es) {
  if (es == null || !history.length) return null;
  const last = history[history.length - 1]?.value;
  if (last == null) return null;
  if (es > last) return "naik";
  if (es < last) return "turun";
  return "stabil";
}

export function buildExecutiveInsights({ overview, advanced, inventory, forecast }) {
  const insights = [];

  const mom = advanced.periodComparison.mom;
  if (mom) {
    insights.push(
      `Penjualan bulan lalu ${mom.pctChange > 0 ? "naik" : mom.pctChange < 0 ? "turun" : "stabil"} ${Math.abs(mom.pctChange)}% dibanding bulan sebelumnya (${fmtRpShort(mom.previousRevenue)} → ${fmtRpShort(mom.currentRevenue)}).`,
    );
  }

  insights.push(
    `Persentase keuntungan keseluruhan saat ini ${fmtPercent(advanced.kpi.overallMarginPct)}.`,
  );

  if (overview.quickInsight.pasarTerbaik) {
    insights.push(
      `Cabang ${LOCATION_LABELS[overview.quickInsight.pasarTerbaik.location] ?? overview.quickInsight.pasarTerbaik.location} menjadi penyumbang penjualan tertinggi periode ini.`,
    );
  }

  if (overview.quickInsight.produkTerlaris) {
    insights.push(
      `${overview.quickInsight.produkTerlaris.kode} adalah produk terlaris periode ini.`,
    );
  }

  if (inventory.stockHealth.dead > 0) {
    insights.push(
      `Ada ${inventory.stockHealth.dead} produk yang belum pernah terjual (stok tidak bergerak).`,
    );
  }

  if (advanced.kpi.returnRate >= EXECUTIVE_RETURN_RATE_WARNING) {
    insights.push(
      `Tingkat retur ${fmtPercent(advanced.kpi.returnRate)} — di atas ambang wajar, ${fmtRpShort(advanced.kpi.returnRevenueImpact)} penjualan hilang karena retur.`,
    );
  }

  const revenueTrend = trendDirection(
    forecast.revenueForecast.history,
    forecast.revenueForecast.es,
  );
  if (revenueTrend) {
    insights.push(
      `Perkiraan penjualan periode berikutnya cenderung ${revenueTrend} (berdasarkan tren terbaru).`,
    );
  }

  if (advanced.marginRisk.negativeMarginProducts.length > 0) {
    insights.push(
      `Ada ${advanced.marginRisk.negativeMarginProducts.length} produk yang terjual rugi (persentase keuntungan negatif).`,
    );
  }

  insights.push(
    `5 produk teratas menyumbang ${fmtPct1(advanced.revenueConcentration.top5Pct)} dari total penjualan.`,
  );

  if (advanced.newVsReturning.newRevenue + advanced.newVsReturning.returningRevenue > 0) {
    insights.push(
      `Penjualan dari pelanggan baru ${fmtRpShort(advanced.newVsReturning.newRevenue)}, pelanggan lama ${fmtRpShort(advanced.newVsReturning.returningRevenue)}.`,
    );
  }

  return insights.slice(0, EXECUTIVE_INSIGHT_MAX);
}

export function buildRecommendations({ advanced, inventory, forecast }) {
  const recs = [];

  if (inventory.suggestedRestock.length > 0) {
    const kodes = inventory.suggestedRestock
      .slice(0, 3)
      .map((r) => r.kode)
      .join(", ");
    recs.push(
      `Restock produk: ${kodes}${inventory.suggestedRestock.length > 3 ? ", dan lainnya" : ""}.`,
    );
  }

  if (advanced.marginRisk.negativeMarginProducts.length > 0) {
    const kodes = advanced.marginRisk.negativeMarginProducts
      .slice(0, 3)
      .map((m) => m.kode)
      .join(", ");
    recs.push(`Evaluasi harga/modal produk yang terjual rugi: ${kodes}.`);
  }

  if (inventory.stockHealth.overstock > 0) {
    const kodes = inventory.overstock
      .slice(0, 3)
      .map((o) => o.kode)
      .join(", ");
    recs.push(
      `Kurangi/tunda produksi produk stok berlebih: ${kodes || `${inventory.stockHealth.overstock} produk`}.`,
    );
  }

  if (advanced.marketConcentration.length > 0) {
    const top = [...advanced.marketConcentration].sort((a, b) => b.value - a.value)[0];
    if (top)
      recs.push(
        `Fokuskan promosi di cabang ${LOCATION_LABELS[top.location] ?? top.location} (kontribusi penjualan tertinggi, ${fmtPct1(top.pct)}).`,
      );
  }

  if (forecast.restockForecast.length > 0) {
    const kodes = forecast.restockForecast
      .slice(0, 3)
      .map((r) => r.kode)
      .join(", ");
    recs.push(`Siapkan stok untuk perkiraan permintaan periode berikutnya: ${kodes}.`);
  }

  return recs;
}

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

  if (lowStockCount > 0) {
    sedang.push({ label: `${lowStockCount} produk stoknya mulai menipis.`, detail: null });
  }
  if (deadStockCount > 0) {
    sedang.push({
      label: `${deadStockCount} produk sudah lama tidak terjual sama sekali.`,
      detail: null,
    });
  }

  if (demandTrend === "naik") {
    rendah.push({
      label: "Perkiraan permintaan produk meningkat pada periode berikutnya.",
      detail: null,
    });
  }
  if (revenueMomPctChange != null && revenueMomPctChange > 0) {
    rendah.push({
      label: `Penjualan naik ${revenueMomPctChange}% dibanding bulan sebelumnya.`,
      detail: null,
    });
  }

  return { tinggi, sedang, rendah };
}
