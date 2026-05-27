/**
 * DetailModal.jsx
 * Modal detail satu transaksi — pembeli, kasir, lokasi, item per-warna, untung.
 *
 * Props:
 * - sale    : objek transaksi dari IndexedDB
 * - onClose : () => void
 * - onStruk : (sale) => void
 * - onRetur : (sale) => void
 * - onDelete: (sale) => void
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { effectiveQty, itemProfit, formatTime } from "../../lib/salesUtils";

export default function DetailModal({ sale, onClose, onStruk, onRetur, onDelete, onEdit }) {
  if (!sale) return null;

  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const totalProfit = (sale.items ?? []).reduce((s, item) => s + itemProfit(item), 0);

  const statusLabel = {
    synced: { text: "Tersync", cls: "text-green-600" },
    error: { text: "Gagal sync", cls: "text-red-600" },
    pending: { text: "Belum sync", cls: "text-amber-600" },
  }[sale.status] ?? { text: sale.status, cls: "text-skin-text2" };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full border-t-2 md:border-2 border-skin-bdr shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-skin-bdr flex items-start justify-between flex-shrink-0">
          <div>
            {isRetur && (
              <span className="text-sm text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 inline-block mb-1.5 font-medium">
                RETUR
              </span>
            )}
            <h3 className="text-2xl text-skin-text">Detail Transaksi</h3>
            <p className="text-sm text-skin-text2 mt-0.5">{formatTime(sale.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center text-skin-text3 hover:text-skin-text text-3xl"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Info transaksi */}
          <div className="space-y-2.5">
            {sale.buyer_name && (
              <InfoRow label="Pembeli" value={sale.buyer_name.toUpperCase()} bold />
            )}
            {sale.buyer_hp && <InfoRow label="No HP" value={sale.buyer_hp} />}
            <InfoRow label="Kasir" value={(sale.created_by_name ?? "—").toUpperCase()} />
            <InfoRow label="Lokasi" value={locLabel} />
            <InfoRow label="Status" value={statusLabel.text} valueClass={statusLabel.cls} />
          </div>

          {/* Daftar item */}
          <div>
            <p className="text-sm text-skin-text2 tracking-[0.08em] uppercase mb-2.5 font-medium">
              Item
            </p>
            <div className="space-y-2.5">
              {(sale.items ?? []).map((item, idx) => {
                const qty = effectiveQty(item);
                const profit = itemProfit(item);
                return (
                  <div key={idx} className="border border-skin-bdr p-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-semibold text-skin-text">
                        {item.kode?.toUpperCase()} — {item.size?.toUpperCase()}
                      </span>
                      <span className="text-base font-semibold text-skin-text">
                        Rp {formatHarga(item.harga * qty)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-skin-text2 mt-0.5">
                      <span>
                        ×{qty} @ Rp {formatHarga(item.harga)}
                      </span>
                      {(item.hpp ?? 0) > 0 && !isRetur && (
                        <span className="text-green-600 font-medium">
                          untung Rp {formatHarga(profit)}
                        </span>
                      )}
                    </div>
                    {item.warna?.length > 0 && (
                      <div className="pl-3 mt-2 space-y-1">
                        {item.warna.map((w, i) => (
                          <p key={i} className="text-sm text-skin-text2">
                            {(w.nama ?? "").toUpperCase()} ×{w.qty}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 border-[#1A1918] pt-4 space-y-2">
            {(sale.discount ?? 0) > 0 && (
              <>
                <InfoRow label="Subtotal" value={`Rp ${formatHarga(sale.total + sale.discount)}`} />
                <InfoRow
                  label="Diskon"
                  value={`− Rp ${formatHarga(sale.discount)}`}
                  valueClass="text-red-500"
                />
              </>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-base text-skin-text2 uppercase tracking-[0.08em]">
                {isRetur ? "Total Retur" : "Total"}
              </span>
              <span
                className={`text-3xl font-semibold leading-none ${isRetur ? "text-orange-500" : "text-[#CAB170]"}`}
              >
                Rp {formatHarga(sale.total)}
              </span>
            </div>
            {!isRetur && totalProfit > 0 && (
              <InfoRow
                label="Total untung"
                value={`Rp ${formatHarga(totalProfit)}`}
                valueClass="text-green-600 font-semibold"
              />
            )}
          </div>
        </div>

        {/* Riwayat edit (audit trail) */}
        {(sale.edit_history ?? []).length > 0 && (
          <div className="border-t border-skin-bdr-lt px-5 py-4 flex-shrink-0">
            <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold mb-2">
              Riwayat Edit
            </p>
            <div className="space-y-1.5">
              {sale.edit_history.map((h, i) => (
                <div
                  key={i}
                  className="text-xs text-skin-text2 bg-skin-page border border-skin-bdr px-3 py-2"
                >
                  <span className="font-semibold">
                    {new Date(h.at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {" · "}
                  {h.by}
                  {" — "}
                  {h.note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tombol aksi */}
        <div
          className="border-t-2 border-skin-bdr p-4 grid gap-2 flex-shrink-0"
          style={{ gridTemplateColumns: isRetur ? "1fr 1fr" : "repeat(4, 1fr)" }}
        >
          <ActionBtn
            icon="🖨"
            label="Struk"
            onClick={() => {
              onClose();
              onStruk(sale);
            }}
          />
          {!isRetur && (
            <>
              <ActionBtn
                icon="✎"
                label="Edit"
                onClick={() => {
                  onClose();
                  onEdit?.(sale);
                }}
                hoverClass="hover:border-blue-300 hover:text-blue-600"
              />
              <ActionBtn
                icon="↩"
                label="Retur"
                onClick={() => {
                  onClose();
                  onRetur(sale);
                }}
                hoverClass="hover:border-orange-300 hover:text-orange-600"
              />
            </>
          )}
          <ActionBtn
            icon="🗑"
            label="Hapus"
            onClick={() => {
              onClose();
              onDelete(sale);
            }}
            hoverClass="hover:border-red-300 hover:text-red-500"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-komponen internal ────────────────────────────────────────────────────
function InfoRow({ label, value, valueClass = "text-skin-text", bold }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-sm text-skin-text2 flex-shrink-0">{label}</span>
      <span className={`text-base ${valueClass} ${bold ? "font-semibold" : ""} text-right`}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  hoverClass = "hover:border-[#CAB170] hover:text-[#CAB170]",
}) {
  return (
    <button
      onClick={onClick}
      className={`py-4 text-sm tracking-[0.08em] uppercase border-2 border-skin-bdr text-skin-text2 transition flex flex-col items-center gap-1.5 font-medium ${hoverClass}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
