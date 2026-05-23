/**
 * LaporanKeuangan.jsx
 * Ringkasan keuangan dari sales yang sudah difilter:
 * - Omset (total penjualan)
 * - Modal (HPP × qty)
 * - Keuntungan (omset - modal)
 * - Breakdown omset per hari
 *
 * Props:
 * - sales : array transaksi (sudah difilter oleh Laporan.jsx)
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { effectiveQty, itemProfit } from "../../lib/salesUtils";

function effectiveHpp(item) {
  return (item.hpp ?? 0) * effectiveQty(item);
}

export default function LaporanKeuangan({ sales }) {
  const realSales  = sales.filter((s) => s.type !== "retur");
  const returSales = sales.filter((s) => s.type === "retur");

  const omset     = realSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const modal     = realSales.reduce((s, t) =>
    s + (t.items ?? []).reduce((ss, item) => ss + effectiveHpp(item), 0), 0);
  const keuntungan = realSales.reduce((s, t) =>
    s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0), 0);
  const totalDiskon  = realSales.reduce((s, t) => s + (t.discount ?? 0), 0);
  const totalRetur   = returSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const marginPct    = omset > 0 ? Math.round((keuntungan / omset) * 100) : 0;

  // Breakdown per hari
  const byDay = {};
  for (const t of realSales) {
    const d = t.date ?? t.created_at?.split("T")[0] ?? "—";
    if (!byDay[d]) byDay[d] = { omset: 0, keuntungan: 0, count: 0 };
    byDay[d].omset      += t.total ?? 0;
    byDay[d].keuntungan += (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0);
    byDay[d].count      += 1;
  }
  const days = Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="p-4 space-y-4">

      {/* ── Kartu ringkasan utama ── */}
      <div className="grid grid-cols-2 gap-3">
        <KeuCard label="Omset" value={`Rp ${formatHarga(omset)}`} sub={`${realSales.length} transaksi`} color="gold" />
        <KeuCard label="Keuntungan" value={keuntungan > 0 ? `Rp ${formatHarga(keuntungan)}` : "—"} sub={`Margin ${marginPct}%`} color="green" />
        <KeuCard label="Modal (HPP)" value={modal > 0 ? `Rp ${formatHarga(modal)}` : "—"} sub="total biaya produk" color="neutral" />
        <KeuCard label="Total Diskon" value={totalDiskon > 0 ? `Rp ${formatHarga(totalDiskon)}` : "—"} sub="dari semua transaksi" color="neutral" />
      </div>

      {totalRetur > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 px-4 py-3">
          <p className="text-sm text-orange-800 font-semibold">
            ↩ Total Retur: Rp {formatHarga(totalRetur)} ({returSales.length} transaksi)
          </p>
        </div>
      )}

      {/* ── Breakdown per hari ── */}
      {days.length > 0 && (
        <div className="bg-skin-card border-2 border-skin-bdr">
          <div className="px-4 py-3 border-b border-skin-bdr">
            <p className="text-sm text-skin-text3 uppercase tracking-[0.1em] font-semibold">Omset per Hari</p>
          </div>
          <div className="divide-y divide-skin-bdr-lt">
            {days.map(([date, data]) => {
              const label = new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
                weekday: "short", day: "numeric", month: "short",
              });
              return (
                <div key={date} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-base font-semibold text-skin-text">{label}</p>
                    <p className="text-sm text-skin-text3">{data.count} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#CAB170] font-headline">
                      {formatHarga(data.omset)}
                    </p>
                    {data.keuntungan > 0 && (
                      <p className="text-sm text-green-600 font-medium">+{formatHarga(data.keuntungan)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {days.length === 0 && (
        <p className="text-center text-base text-skin-text4 py-12">Belum ada data keuangan</p>
      )}
    </div>
  );
}

function KeuCard({ label, value, sub, color }) {
  const valueColor =
    color === "gold"    ? "text-[#CAB170]"  :
    color === "green"   ? "text-green-600"   :
    "text-skin-text";

  return (
    <div className="bg-skin-card border-2 border-skin-bdr px-4 py-4">
      <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold leading-tight ${valueColor}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-skin-text3 mt-1">{sub}</p>}
    </div>
  );
}
