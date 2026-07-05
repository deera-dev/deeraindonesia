/**
 * HPPCard.jsx — Kartu tampilan template HPP tersimpan.
 */
import { useState } from "react";
import { fmtRp, fmt4, calcQtyPerBaju } from "../utils";

export default function HPPCard({ tpl, produk, onEdit, onDelete, onShare }) {
  const [expanded, setExpanded] = useState(false);

  // Infer gelaran from saved bahan_items (all share the same untuk_n_baju)
  const gelaran = tpl.bahan_items?.[0]?.untuk_n_baju ?? 1;

  return (
    <div className="bg-skin-card border border-skin-bdr">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-skin-text">{tpl.kode_produk}</p>
            <p className="text-xs text-skin-text3 truncate">{produk?.nama ?? "—"}</p>
            {gelaran > 1 && (
              <p className="text-[10px] text-[#CAB170] mt-0.5">
                Gelaran: {gelaran} produk per potong
              </p>
            )}
          </div>
          <span className="text-lg font-bold text-[#CAB170] shrink-0">{fmtRp(tpl.total_hpp)}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
          >
            {expanded ? "Tutup" : "Detail"}
          </button>
          {onShare && (
            <button
              onClick={() => onShare(tpl)}
              className="px-3 py-2 text-xs border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
              title="Bagikan HPP"
            >
              ↑
            </button>
          )}
          <button
            onClick={() => onEdit(tpl)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(tpl)}
            className="px-3 py-2 text-xs border border-skin-bdr text-red-400 hover:text-red-600 transition"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-skin-bdr-lt px-4 pb-4 space-y-3">
          {(tpl.bahan_items ?? []).length > 0 && (
            <div>
              <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mt-3 mb-2">
                Bahan
              </p>
              {tpl.bahan_items.map((b, i) => {
                // Gunakan qty_per_baju & subtotal yang sudah dihitung saat save,
                // agar konsisten dengan total_hpp tersimpan.
                const nBaju = Math.max(Number(b.untuk_n_baju) || 1, 1);
                const qpb = Number(b.qty_per_baju) || calcQtyPerBaju(b);
                const subtotal = Number(b.subtotal) || Math.round(qpb * (Number(b.harga_satuan) || 0));
                const isMotif = b.jenis === "motif";
                const warnaQtys = isMotif
                  ? (b.warna_qtys ?? []).filter((w) => Number(w.qty) > 0)
                  : [];
                return (
                  <div
                    key={i}
                    className="py-1.5 border-b border-skin-bdr-lt last:border-0 space-y-0.5"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="text-skin-text2 font-medium">
                        {b.nama_bahan}
                        <span className="ml-1 text-skin-text3 font-normal">
                          ({isMotif ? "motif" : "tambahan"})
                        </span>
                      </span>
                      <span className="text-[#CAB170] font-semibold">
                        {fmtRp(subtotal)}
                      </span>
                    </div>
                    {/* Motif: tampilkan per warna (qty per baju per warna) */}
                    {isMotif && warnaQtys.length > 0 ? (
                      <div className="space-y-0.5 pl-1 border-l-2 border-skin-bdr">
                        {warnaQtys.map((w, wi) => (
                          <p key={wi} className="text-xs text-skin-text3">
                            {w.warna || `Warna ${wi + 1}`}: {fmt4(Number(w.qty) / nBaju)} {b.satuan_ukur || b.satuan}/baju
                          </p>
                        ))}
                        <p className="text-xs text-skin-text3">
                          {fmt4(qpb)} {b.satuan}/baju × {fmtRp(b.harga_satuan)}/{b.satuan}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-skin-text3">
                        {fmt4(qpb)} {b.satuan}/baju × {fmtRp(b.harga_satuan)}/{b.satuan}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-1 text-xs">
            {tpl.upah_jahit > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Upah Jahit</span>
                <span>{fmtRp(tpl.upah_jahit)}</span>
              </div>
            )}
            {tpl.bordir > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Bordir</span>
                <span>{fmtRp(tpl.bordir)}</span>
              </div>
            )}
            {tpl.biaya_studio > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Biaya Studio</span>
                <span>{fmtRp(tpl.biaya_studio)}</span>
              </div>
            )}
            {tpl.kancing_qty > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Kancing ({tpl.kancing_qty} biji)</span>
                <span>{fmtRp(tpl.kancing_qty * (tpl.config_snapshot?.kancing_satuan ?? 500))}</span>
              </div>
            )}
            {(tpl.kancing_extra ?? []).filter(k => k.qty > 0 && k.harga_per > 0).map((k, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-skin-text3">{k.label || "Kancing lain"} ({k.qty} biji)</span>
                <span>{fmtRp(k.qty * k.harga_per)}</span>
              </div>
            ))}
          </div>
          {tpl.catatan && <p className="text-xs text-skin-text3 italic">{tpl.catatan}</p>}
        </div>
      )}
    </div>
  );
}
