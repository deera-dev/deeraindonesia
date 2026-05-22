/**
 * SaleCard.jsx
 * Kartu satu transaksi di daftar Laporan.
 * - Tap header → buka DetailModal
 * - Tombol bawah: Struk / Retur / Hapus
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { effectiveQty, itemProfit, formatTime } from "../../lib/salesUtils";

export default function SaleCard({ sale, onDetail, onStruk, onRetur, onDelete, onEdit }) {
  const isRetur  = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const profit   = (sale.items ?? []).reduce((s, item) => s + itemProfit(item), 0);

  return (
    <div className={`bg-white border-2 overflow-hidden ${
      isRetur                   ? "border-orange-200" :
      sale.status === "pending" ? "border-amber-200"  :
      sale.status === "error"   ? "border-red-200"    :
      "border-[#E8E3DC]"
    }`}>

      {/* ── Header: tap untuk detail ── */}
      <button
        onClick={() => onDetail(sale)}
        className="w-full text-left px-4 py-4 flex items-start justify-between gap-3 active:bg-[#F9F7F4]"
      >
        <div className="min-w-0">
          {isRetur && (
            <span className="text-sm text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 inline-block mb-1.5 font-medium">
              RETUR
            </span>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-[#6B6560]">{formatTime(sale.created_at)}</p>
            {(sale.edit_history ?? []).length > 0 && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 font-medium">
                ✎ diedit
              </span>
            )}
          </div>
          {sale.buyer_name && (
            <p className="text-lg text-[#1A1918] font-semibold mt-0.5 leading-tight">{sale.buyer_name}</p>
          )}
          <p className="text-sm text-[#6B6560] mt-0.5">
            {sale.created_by_name ? `${sale.created_by_name} · ` : ""}{locLabel}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p
            className={`text-2xl leading-none font-semibold ${isRetur ? "text-orange-500" : "text-[#CAB170]"}`}
            style={{ fontFamily: "'Braise', serif" }}
          >
            Rp {formatHarga(sale.total)}
          </p>
          {!isRetur && profit > 0 && (
            <p className="text-sm text-green-600 mt-1 font-medium">untung Rp {formatHarga(profit)}</p>
          )}
          {sale.status === "pending" && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 mt-1.5 inline-block">
              Belum sync
            </span>
          )}
          {sale.status === "error" && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 mt-1.5 inline-block">
              Gagal sync
            </span>
          )}
        </div>
      </button>

      {/* ── Item preview ── */}
      <div className="border-t border-[#F0EBE3] px-4 py-3 space-y-2">
        {(sale.items ?? []).map((item, idx) => {
          const qty = effectiveQty(item);
          return (
            <div key={idx}>
              <div className="flex justify-between items-baseline">
                <span className="text-base text-[#6B6560]">{item.kode} — {item.size} ×{qty}</span>
                <span className="text-base text-[#1A1918] font-medium">Rp {formatHarga(item.harga * qty)}</span>
              </div>
              {item.warna?.length > 0 && (
                <div className="pl-3 mt-1 space-y-0.5">
                  {item.warna.map((w, i) => (
                    <p key={i} className="text-sm text-[#6B6560]">{w.nama} ×{w.qty}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Tombol aksi cepat ── */}
      <div className="border-t border-[#F0EBE3] px-4 py-3 flex gap-2">
        <button
          onClick={() => onStruk(sale)}
          className="flex-1 py-4 text-sm tracking-[0.08em] uppercase border-2 border-[#E8E3DC] text-[#6B6560] hover:border-[#CAB170] hover:text-[#CAB170] transition font-medium"
        >
          🖨 Struk
        </button>
        {!isRetur && (
          <>
            <button
              onClick={() => onEdit?.(sale)}
              className="flex-1 py-4 text-sm tracking-[0.08em] uppercase border-2 border-[#E8E3DC] text-[#6B6560] hover:border-blue-300 hover:text-blue-600 transition font-medium"
            >
              ✎ Edit
            </button>
            <button
              onClick={() => onRetur(sale)}
              className="flex-1 py-4 text-sm tracking-[0.08em] uppercase border-2 border-[#E8E3DC] text-[#6B6560] hover:border-orange-300 hover:text-orange-600 transition font-medium"
            >
              ↩ Retur
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(sale)}
          className="py-4 px-5 text-xl border-2 border-[#E8E3DC] text-[#9C9690] hover:border-red-300 hover:text-red-500 transition"
          title="Hapus transaksi"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
