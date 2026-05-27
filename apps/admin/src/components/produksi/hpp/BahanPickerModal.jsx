/**
 * BahanPickerModal.jsx — Modal pencarian & pilih bahan untuk HPP.
 */
import { useState } from "react";
import { fmtRp } from "./hppUtils";

export default function BahanPickerModal({ options, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const filtered = options.filter(
    (o) =>
      o._label.toLowerCase().includes(q.toLowerCase()) ||
      (o.kode_bahan ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-sm max-h-[80dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        <div className="p-4 border-b border-skin-bdr-lt">
          <p className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text2 mb-2">
            Pilih Bahan
          </p>
          <input
            autoFocus
            type="text"
            placeholder="Cari nama atau kode..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170]"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-skin-text3 text-center">Tidak ditemukan.</p>
          )}
          {filtered.map((o) => (
            <button
              key={`${o._type}-${o.id}`}
              onClick={() => onSelect(o)}
              className="w-full text-left px-4 py-3 hover:bg-skin-raised transition"
            >
              <p className="text-sm text-skin-text">{o.nama_bahan}</p>
              <p className="text-xs text-skin-text3">
                {o._type === "pinjam" ? "Pinjam" : "Beli"} · {fmtRp(o.harga_satuan)}/{o.satuan}
                {o.kode_bahan ? ` · ${o.kode_bahan}` : ""}
              </p>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-skin-bdr-lt">
          <button
            onClick={onClose}
            className="w-full py-2.5 font-editorial text-xs tracking-[0.2em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
