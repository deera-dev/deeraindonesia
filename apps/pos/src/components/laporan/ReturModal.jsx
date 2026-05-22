/**
 * ReturModal.jsx
 * Modal partial retur — kasir memilih item & qty yang dikembalikan pembeli.
 * Stok otomatis dikembalikan ke lokasi asal setelah dikonfirmasi.
 *
 * Props:
 * - sale      : transaksi asal
 * - onClose   : () => void
 * - onConfirm : (payloadItems, returTotal) => void
 * - saving    : boolean
 */
import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";

export default function ReturModal({ sale, onClose, onConfirm, saving }) {
  // Inisialisasi state retur dari item transaksi asal
  const [returItems, setReturItems] = useState(() =>
    (sale.items ?? []).map((item) =>
      item.warna?.length > 0
        ? { ...item, warna: item.warna.map((w) => ({ ...w, returQty: 0 })) }
        : { ...item, returQty: 0 }
    )
  );

  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";

  // Helpers
  function clamp(val, max) { return Math.max(0, Math.min(max, Number(val) || 0)); }

  function setWarnaQty(itemIdx, warnaIdx, val) {
    setReturItems((prev) => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, warna: item.warna.map((w, j) =>
        j !== warnaIdx ? w : { ...w, returQty: clamp(val, w.qty) }
      )};
    }));
  }

  function setSimpleQty(itemIdx, val) {
    setReturItems((prev) => prev.map((item, i) =>
      i !== itemIdx ? item : { ...item, returQty: clamp(val, item.qty ?? 0) }
    ));
  }

  // Payload — hanya item dengan qty > 0
  const payloadItems = returItems.flatMap((item) => {
    if (item.warna) {
      const warnaFiltered = item.warna
        .filter((w) => w.returQty > 0)
        .map((w) => ({ nama: w.nama, qty: w.returQty }));
      return warnaFiltered.length ? [{ ...item, warna: warnaFiltered }] : [];
    }
    return (item.returQty ?? 0) > 0 ? [{ ...item, qty: item.returQty }] : [];
  });

  const returTotal = payloadItems.reduce((s, item) => {
    const qty = item.warna
      ? item.warna.reduce((ss, w) => ss + w.qty, 0)
      : (item.qty ?? 0);
    return s + qty * item.harga;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-sm border-t-2 md:border-2 border-[#E8E3DC] shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-[#E8E3DC] flex-shrink-0">
          <h3 className="text-2xl text-[#1A1918]" style={{ fontFamily: "'Braise', serif" }}>
            Retur Barang
          </h3>
          <p className="text-sm text-[#6B6560] mt-1">
            Stok kembali ke <strong className="text-[#1A1918]">{locLabel}</strong> · Pilih qty yang dikembalikan
          </p>
        </div>

        {/* Daftar item dengan qty control */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {returItems.map((item, itemIdx) => (
            <div key={itemIdx} className="border border-[#E8E3DC] p-4">
              <p className="text-base font-semibold text-[#1A1918]">{item.kode} — {item.size}</p>
              <p className="text-sm text-[#6B6560] mb-3">@ Rp {formatHarga(item.harga)}</p>

              {item.warna ? (
                <div className="space-y-3">
                  {item.warna.map((w, warnaIdx) => (
                    <div key={warnaIdx} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-base text-[#1A1918] font-medium">{w.nama}</span>
                        <span className="text-sm text-[#9C9690] ml-2">(maks {w.qty})</span>
                      </div>
                      <QtyControl
                        value={w.returQty}
                        max={w.qty}
                        onChange={(val) => setWarnaQty(itemIdx, warnaIdx, val)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-base text-[#1A1918]">Qty</span>
                    <span className="text-sm text-[#9C9690] ml-2">(maks {item.qty ?? 0})</span>
                  </div>
                  <QtyControl
                    value={item.returQty}
                    max={item.qty ?? 0}
                    onChange={(val) => setSimpleQty(itemIdx, val)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer: total + konfirmasi */}
        <div className="border-t-2 border-[#E8E3DC] px-5 py-4 flex-shrink-0 space-y-3">
          {payloadItems.length > 0 && (
            <div className="flex justify-between items-baseline">
              <span className="text-base text-[#6B6560]">Total retur</span>
              <span className="text-xl font-semibold text-orange-500">Rp {formatHarga(returTotal)}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => payloadItems.length > 0 && onConfirm(payloadItems, returTotal)}
              disabled={!payloadItems.length || saving}
              className="flex-1 py-5 bg-orange-500 text-white text-base tracking-[0.12em] uppercase hover:bg-orange-600 transition disabled:opacity-40 font-semibold"
            >
              {saving ? "Memproses..." : "Konfirmasi Retur"}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-5 border-2 border-[#E8E3DC] text-base text-[#6B6560] uppercase hover:border-[#1A1918] transition disabled:opacity-40"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Qty stepper ──────────────────────────────────────────────────────────────
function QtyControl({ value, max, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className="w-11 h-11 border-2 border-[#E8E3DC] text-xl text-[#6B6560] hover:bg-[#F9F7F4] disabled:opacity-30 flex items-center justify-center"
        aria-label="Kurangi"
      >
        −
      </button>
      <span className="w-8 text-center text-lg font-bold text-[#1A1918]">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="w-11 h-11 border-2 border-[#E8E3DC] text-xl text-[#6B6560] hover:bg-[#F9F7F4] disabled:opacity-30 flex items-center justify-center"
        aria-label="Tambah"
      >
        +
      </button>
    </div>
  );
}
