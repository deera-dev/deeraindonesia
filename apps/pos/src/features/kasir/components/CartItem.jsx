import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { effectiveQty } from "../../../shared/lib/salesUtils";
import PriceEditor from "./PriceEditor";

function formatBreakdown(breakdown) {
  if (!Array.isArray(breakdown)) return null;
  const active = breakdown.filter((b) => b.qty > 0);
  if (active.length <= 1) return null;
  return active.map((b) => `${LOCATION_LABELS[b.location] ?? b.location} ${b.qty}`).join(" · ");
}

export default function CartItem({
  item,
  isEditingPrice,
  onEditPrice,
  onSavePrice,
  onCancelPrice,
  onUpdateQty,
  onRemove,
  onEditWarna,
}) {
  const qty = effectiveQty(item);

  return (
    <div className="p-4 bg-skin-page border border-skin-bdr">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-skin-text leading-tight">
            {item.kode} <span className="text-skin-text2">— {item.size}</span>
          </p>

          {!isEditingPrice ? (
            <button
              onClick={onEditPrice}
              className="flex items-center gap-1.5 mt-1 group"
              title="Tap untuk ubah harga"
            >
              <span className="text-base text-skin-accent-text font-semibold border-b border-dashed border-skin-accent/50 group-hover:border-skin-accent transition">
                Rp {formatHarga(item.harga)}
              </span>
              <span className="text-xs text-skin-text4 group-hover:text-skin-accent-text transition">
                ✎ ubah
              </span>
            </button>
          ) : (
            <PriceEditor harga={item.harga} onSave={onSavePrice} onCancel={onCancelPrice} />
          )}
        </div>

        <button
          onClick={onRemove}
          className="w-11 h-11 border-2 border-skin-bdr flex items-center justify-center text-skin-text4 hover:border-red-300 hover:text-red-500 transition text-2xl leading-none flex-shrink-0"
          aria-label="Hapus item"
        >
          ×
        </button>
      </div>

      {item.warna ? (
        <div className="space-y-1.5 mb-3">
          {item.warna.map((w, i) => {
            const bdLabel = formatBreakdown(w.breakdown);
            return (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span className="text-skin-text2">
                    {w.nama} ×{w.qty}
                  </span>
                  <span className="text-skin-text font-medium">
                    Rp {formatHarga(w.qty * item.harga)}
                  </span>
                </div>
                {bdLabel && <p className="text-xs text-skin-text4 mt-0.5">{bdLabel}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateQty(-1)}
              className="w-12 h-12 border-2 border-skin-bdr text-2xl text-skin-text2 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center"
              aria-label="Kurangi"
            >
              −
            </button>
            <span className="text-xl font-bold text-skin-text w-8 text-center">{item.qty}</span>
            <button
              onClick={() => onUpdateQty(+1)}
              className="w-12 h-12 border-2 border-skin-bdr text-2xl text-skin-text2 hover:border-skin-accent hover:text-skin-accent-text transition flex items-center justify-center"
              aria-label="Tambah"
            >
              +
            </button>
          </div>
          {formatBreakdown(item.breakdown) && (
            <p className="text-xs text-skin-text4 mt-1.5">{formatBreakdown(item.breakdown)}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-skin-bdr">
        <span className="text-sm text-skin-text2">
          {qty} pcs · <strong className="text-skin-text">Rp {formatHarga(qty * item.harga)}</strong>
        </span>
        {item.warna && (
          <button
            onClick={onEditWarna}
            className="text-sm text-skin-accent-text hover:text-skin-accent-text transition uppercase tracking-[0.08em] py-1 px-2"
          >
            Ubah Warna
          </button>
        )}
      </div>
    </div>
  );
}
