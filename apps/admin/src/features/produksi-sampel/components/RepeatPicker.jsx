/**
 * RepeatPicker.jsx — modal pilih PRODUK JADI (punya kode) sebagai acuan Planning Repeat
 * (permintaan Denny 2026-10-08: repeat = model ikut produk jadi).
 * Hanya menampilkan produk ber-foto (lihat repeatCandidates).
 */
import { useMemo, useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function RepeatPicker({ options, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k
      ? options.filter((s) => `${s.nama} ${s.kode}`.toLowerCase().includes(k))
      : options;
  }, [options, q]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text">
            Pilih Produk Acuan
          </h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-skin-text3 hover:text-skin-text">
            ×
          </button>
        </div>
        <div className="px-4 pt-3 flex-shrink-0">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau kode..."
            className="w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170]"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {list.length === 0 && (
            <p className="text-xs text-skin-text4 italic text-center py-6">
              Produk tidak ditemukan.
            </p>
          )}
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className="w-full flex items-center gap-3 p-2 border border-skin-bdr hover:border-[#CAB170] text-left transition"
            >
              <img
                src={cldUrl(s.image, { width: 96, height: 128, crop: "fill" })}
                alt=""
                className="w-12 h-16 object-cover border border-skin-bdr shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-skin-text truncate">{s.nama}</span>
                <span className="block text-[10px] text-skin-text3">
                  {s.kode}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
