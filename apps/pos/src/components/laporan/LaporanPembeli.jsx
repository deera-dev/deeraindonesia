/**
 * LaporanPembeli.jsx
 * Laporan analitik pembeli:
 * - Top pembeli berdasarkan total belanja & jumlah transaksi
 * - Lokasi pasar terbanyak
 *
 * Props:
 * - sales : array transaksi yang sudah difilter
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";

export default function LaporanPembeli({ sales }) {
  const realSales = sales.filter((s) => s.type !== "retur");

  // Agregat per pembeli (yang punya nama)
  const buyerMap = {};
  for (const t of realSales) {
    if (!t.buyer_name) continue;
    const key = t.buyer_name.trim().toLowerCase();
    if (!buyerMap[key])
      buyerMap[key] = { nama: t.buyer_name, total: 0, count: 0, hp: t.buyer_hp ?? null };
    buyerMap[key].total += t.total ?? 0;
    buyerMap[key].count += 1;
  }
  const buyerList = Object.values(buyerMap).sort((a, b) => b.total - a.total);

  // Pembeli tanpa nama
  const anonim = realSales.filter((s) => !s.buyer_name).length;

  // Agregat per lokasi
  const locMap = {};
  for (const t of realSales) {
    const loc = t.location ?? "—";
    if (!locMap[loc]) locMap[loc] = { total: 0, count: 0 };
    locMap[loc].total += t.total ?? 0;
    locMap[loc].count += 1;
  }
  const locList = Object.entries(locMap)
    .map(([loc, data]) => ({ loc, label: LOCATION_LABELS[loc] ?? loc, ...data }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="p-4 space-y-4">
      {/* ── Summary ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-skin-card border-2 border-skin-bdr px-4 py-4 text-center">
          <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold">
            Pembeli Tercatat
          </p>
          <p className="text-3xl font-bold text-[#CAB170] mt-1 font-headline">{buyerList.length}</p>
          <p className="text-xs text-skin-text3 mt-0.5">nama unik</p>
        </div>
        <div className="bg-skin-card border-2 border-skin-bdr px-4 py-4 text-center">
          <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold">
            Tanpa Nama
          </p>
          <p className="text-3xl font-bold text-skin-text2 mt-1">{anonim}</p>
          <p className="text-xs text-skin-text3 mt-0.5">transaksi</p>
        </div>
      </div>

      {/* ── Top pembeli ── */}
      {buyerList.length > 0 && (
        <div className="bg-skin-card border-2 border-skin-bdr">
          <div className="px-4 py-3 border-b border-skin-bdr flex items-center justify-between">
            <p className="text-sm text-skin-text3 uppercase tracking-[0.1em] font-semibold">
              Top Pembeli
            </p>
          </div>
          <div className="divide-y divide-skin-bdr-lt">
            {buyerList.map((b, idx) => (
              <div key={idx} className="flex items-center px-4 py-3 gap-3">
                <span className="text-sm text-skin-text4 w-6 text-right flex-shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-skin-text truncate">{b.nama}</p>
                  {b.hp && <p className="text-sm text-skin-text3">{b.hp}</p>}
                  <p className="text-sm text-skin-text3">{b.count}× transaksi</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-[#CAB170] font-headline">
                    {formatHarga(b.total)}
                  </p>
                  <p className="text-xs text-skin-text3">total belanja</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lokasi ── */}
      {locList.length > 0 && (
        <div className="bg-skin-card border-2 border-skin-bdr">
          <div className="px-4 py-3 border-b border-skin-bdr">
            <p className="text-sm text-skin-text3 uppercase tracking-[0.1em] font-semibold">
              Pasar / Lokasi
            </p>
          </div>
          <div className="divide-y divide-skin-bdr-lt">
            {locList.map((row, idx) => (
              <div key={idx} className="flex items-center px-4 py-3 gap-3">
                <span className="text-sm text-skin-text4 w-6 text-right flex-shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold text-skin-text">{row.label}</p>
                  <p className="text-sm text-skin-text3">{row.count} transaksi</p>
                </div>
                <p className="text-lg font-bold text-[#CAB170] flex-shrink-0 font-headline">
                  {formatHarga(row.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {buyerList.length === 0 && locList.length === 0 && (
        <p className="text-center text-base text-skin-text4 py-12">Belum ada data pembeli</p>
      )}
    </div>
  );
}
