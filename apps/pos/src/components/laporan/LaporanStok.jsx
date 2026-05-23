/**
 * LaporanStok.jsx
 * Laporan pergerakan stok:
 * - Stok keluar per produk/ukuran (dari penjualan), diranking
 * - Stok masuk per produk/ukuran (dari retur)
 *
 * Props:
 * - sales : array transaksi yang sudah difilter
 */
import { effectiveQty } from "../../lib/salesUtils";

export default function LaporanStok({ sales }) {
  const realSales  = sales.filter((s) => s.type !== "retur");
  const returSales = sales.filter((s) => s.type === "retur");

  // Agregat stok keluar per kode+size
  const keluarMap = {};
  for (const t of realSales) {
    for (const item of t.items ?? []) {
      const key = `${item.kode}|${item.size}`;
      keluarMap[key] = (keluarMap[key] ?? 0) + effectiveQty(item);
    }
  }

  // Agregat stok masuk per kode+size (dari retur)
  const masukMap = {};
  for (const t of returSales) {
    for (const item of t.items ?? []) {
      const key = `${item.kode}|${item.size}`;
      masukMap[key] = (masukMap[key] ?? 0) + effectiveQty(item);
    }
  }

  const keluarList = Object.entries(keluarMap)
    .map(([key, qty]) => { const [kode, size] = key.split("|"); return { kode, size, qty }; })
    .sort((a, b) => b.qty - a.qty);

  const masukList = Object.entries(masukMap)
    .map(([key, qty]) => { const [kode, size] = key.split("|"); return { kode, size, qty }; })
    .sort((a, b) => b.qty - a.qty);

  const totalKeluar = keluarList.reduce((s, r) => s + r.qty, 0);
  const totalMasuk  = masukList.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="p-4 space-y-4">

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-skin-card border-2 border-skin-bdr px-4 py-4 text-center">
          <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold">Stok Keluar</p>
          <p className="text-3xl font-bold text-[#CAB170] mt-1 font-headline">{totalKeluar}</p>
          <p className="text-xs text-skin-text3 mt-0.5">pcs terjual</p>
        </div>
        <div className="bg-skin-card border-2 border-skin-bdr px-4 py-4 text-center">
          <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold">Stok Masuk</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{totalMasuk}</p>
          <p className="text-xs text-skin-text3 mt-0.5">pcs dari retur</p>
        </div>
      </div>

      {/* ── Ranking stok keluar ── */}
      {keluarList.length > 0 && (
        <div className="bg-skin-card border-2 border-skin-bdr">
          <div className="px-4 py-3 border-b border-skin-bdr flex items-center justify-between">
            <p className="text-sm text-skin-text3 uppercase tracking-[0.1em] font-semibold">Stok Keluar — Ranking</p>
            <p className="text-xs text-skin-text3">{keluarList.length} varian</p>
          </div>
          <div className="divide-y divide-skin-bdr-lt">
            {keluarList.map((row, idx) => (
              <div key={idx} className="flex items-center px-4 py-3 gap-3">
                <span className="text-sm text-skin-text4 w-6 text-right flex-shrink-0">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-skin-text">{row.kode}</p>
                  <p className="text-sm text-skin-text3 uppercase tracking-wide">{row.size}</p>
                </div>
                <span className="text-xl font-bold text-skin-text flex-shrink-0">{row.qty} <span className="text-sm font-normal text-skin-text3">pcs</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stok masuk (retur) ── */}
      {masukList.length > 0 && (
        <div className="bg-skin-card border-2 border-orange-200">
          <div className="px-4 py-3 border-b border-orange-100">
            <p className="text-sm text-orange-700 uppercase tracking-[0.1em] font-semibold">Stok Masuk (Retur)</p>
          </div>
          <div className="divide-y divide-orange-100">
            {masukList.map((row, idx) => (
              <div key={idx} className="flex items-center px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-skin-text">{row.kode}</p>
                  <p className="text-sm text-skin-text3 uppercase tracking-wide">{row.size}</p>
                </div>
                <span className="text-xl font-bold text-orange-500 flex-shrink-0">{row.qty} <span className="text-sm font-normal text-skin-text3">pcs</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {keluarList.length === 0 && masukList.length === 0 && (
        <p className="text-center text-base text-skin-text4 py-12">Belum ada data stok</p>
      )}
    </div>
  );
}
