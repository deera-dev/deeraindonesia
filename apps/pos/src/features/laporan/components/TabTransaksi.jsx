/**
 * TabTransaksi.jsx — Sub-tab "Transaksi" halaman Laporan: summary strip +
 * daftar SaleCard. Diekstrak dari pages/Laporan.jsx (komponen inline) agar
 * LaporanPage.jsx tetap menjadi orchestrator yang tipis (CLAUDE.md §13).
 */
import { effectiveQty, itemProfit } from "../../../shared/lib/salesUtils";
import SaleCard from "./SaleCard";

export default function TabTransaksi({ sales, onDetail, onBuyerClick, onStruk, onRetur, onDelete, onEdit }) {
  const realSales = sales.filter((s) => s.type !== "retur");
  const pending = sales.filter((s) => s.status === "pending").length;

  const omset = realSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const untung = realSales.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0),
    0,
  );
  const totalPcs = realSales.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + (effectiveQty(item) ?? 0), 0),
    0,
  );

  return (
    <div className="flex flex-col">
      {/* ── Summary strip ── */}
      <div className="bg-skin-card border-b border-skin-bdr grid grid-cols-2 divide-x divide-skin-bdr">
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-skin-text4 uppercase tracking-wider">Transaksi</p>
          <p className="font-headline text-2xl text-skin-text mt-1">{realSales.length}</p>
          {totalPcs > 0 && (
            <p className="text-xs text-green-600 mt-0.5 font-medium">{totalPcs} pcs keluar</p>
          )}
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-skin-text4 uppercase tracking-wider">Omset</p>
          <p className="font-headline text-lg text-[#CAB170] mt-1 leading-tight">
            {omset > 0 ? omset.toLocaleString("id-ID") : "—"}
          </p>
          <p className="text-xs text-green-600 mt-0.5 font-medium">
            {untung > 0 ? `+${untung.toLocaleString("id-ID")}` : "—"}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center justify-between rounded-sm">
            <p className="text-sm text-amber-800">⏳ {pending} belum sync</p>
            <p className="text-xs text-amber-500">otomatis saat online</p>
          </div>
        )}

        {sales.length === 0 && (
          <p className="text-center text-base text-skin-text4 py-16">Belum ada transaksi</p>
        )}

        {sales.map((sale) => (
          <SaleCard
            key={sale.id}
            sale={sale}
            onDetail={onDetail}
            onBuyerClick={onBuyerClick}
            onStruk={onStruk}
            onRetur={onRetur}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
