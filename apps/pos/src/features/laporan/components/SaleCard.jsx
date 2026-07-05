/**
 * SaleCard.jsx
 * Kartu satu transaksi di daftar Laporan.
 * - Tap header → buka DetailModal
 * - Tombol bawah: Struk / Retur / Hapus
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { effectiveQty, itemProfit, formatTime } from "../../../shared/lib/salesUtils";

export default function SaleCard({ sale, onDetail, onStruk, onRetur, onDelete, onEdit }) {
  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const profit = (sale.items ?? []).reduce((s, item) => s + itemProfit(item), 0);

  const accentColor = isRetur
    ? "bg-orange-400"
    : sale.status === "pending"
      ? "bg-amber-400"
      : sale.status === "error"
        ? "bg-red-400"
        : "bg-[#CAB170]";

  return (
    <div className="bg-skin-card border border-skin-bdr overflow-hidden flex">
      {/* Left accent bar */}
      <div className={`w-1 flex-shrink-0 ${accentColor}`} />

      <div className="flex-1 min-w-0">
        {/* ── Header: tap untuk detail ── */}
        <button
          onClick={() => onDetail(sale)}
          className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 active:bg-skin-raised transition"
        >
          <div className="min-w-0">
            {/* Meta: waktu + status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-skin-text3 tracking-wide">{formatTime(sale.created_at)}</p>
              {isRetur && (
                <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-sm font-semibold">
                  RETUR
                </span>
              )}
              {(sale.edit_history ?? []).length > 0 && (
                <span className="text-xs text-blue-500 font-medium">✎</span>
              )}
              {sale.status === "pending" && (
                <span className="text-xs text-amber-600 font-medium">· belum sync</span>
              )}
              {sale.status === "error" && (
                <span className="text-xs text-red-500 font-medium">· gagal sync</span>
              )}
            </div>

            {/* Pembeli + lokasi */}
            {sale.buyer_name ? (
              <p className="text-base text-skin-text font-semibold mt-1 leading-tight">
                {sale.buyer_name.toUpperCase()}
              </p>
            ) : null}
            <p className="text-xs text-skin-text3 mt-0.5">
              {sale.created_by_name ? `${sale.created_by_name.toUpperCase()} · ` : ""}
              {locLabel}
            </p>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p
              className={`font-headline text-xl leading-tight ${isRetur ? "text-orange-500" : "text-[#CAB170]"}`}
            >
              Rp {formatHarga(sale.total)}
            </p>
            {!isRetur && profit > 0 && (
              <p className="text-xs text-green-600 mt-0.5">+{formatHarga(profit)}</p>
            )}
          </div>
        </button>

        {/* ── Item preview ── */}
        <div className="border-t border-skin-bdr-lt px-4 py-2.5 space-y-1.5">
          {(sale.items ?? []).map((item, idx) => {
            const qty = effectiveQty(item);
            return (
              <div key={idx}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-sm text-skin-text2 min-w-0 truncate">
                    {item.kode?.toUpperCase()} <span className="text-skin-text3">·</span>{" "}
                    {item.size?.toUpperCase()} ×{qty}
                  </span>
                  <span className="text-sm text-skin-text font-medium flex-shrink-0">
                    Rp {formatHarga(item.harga * qty)}
                  </span>
                </div>
                {Array.isArray(item.warna) && item.warna.length > 0 && (
                  <p className="text-xs text-skin-text3 mt-0.5 pl-2">
                    {item.warna.map((w) => `${(w.nama ?? "").toUpperCase()} ×${w.qty}`).join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Tombol aksi ── */}
        <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => onStruk(sale)}
            className="text-xs text-skin-text3 hover:text-[#CAB170] transition font-medium tracking-wide uppercase flex items-center gap-1"
          >
            Lihat Struk
          </button>
          {!isRetur && (
            <>
              <span className="text-skin-bdr">|</span>
              <button
                onClick={() => onEdit?.(sale)}
                className="text-xs text-skin-text3 hover:text-blue-500 transition font-medium tracking-wide uppercase flex items-center gap-1"
              >
                Edit
              </button>
              <span className="text-skin-bdr">|</span>
              <button
                onClick={() => onRetur(sale)}
                className="text-xs text-skin-text3 hover:text-orange-500 transition font-medium tracking-wide uppercase flex items-center gap-1"
              >
                Retur
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(sale)}
            className="ml-auto text-sm text-skin-text4 hover:text-red-500 transition"
            title="Hapus transaksi"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
