/**
 * TagihanBulanPanel.jsx — Ringkasan tagihan pembelian bahan yang belum lunas,
 * dikelompokkan per bulan jatuh tempo, dengan tombol bagikan ke WhatsApp.
 */
import { useState } from "react";
import { fmtRp, fmtBulan, fmtTanggalLengkap, groupTagihanPerBulan } from "../utils";
import ShareTagihanModal from "./ShareTagihanModal";

export default function TagihanBulanPanel({ items }) {
  const [open, setOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const groups = groupTagihanPerBulan(items);

  if (!groups.length) return null;
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="mb-4 border border-amber-500/30 bg-amber-500/5">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-amber-500">
            Tagihan per Bulan (Belum Lunas)
          </p>
          <p className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-0.5">{fmtRp(grandTotal)}</p>
        </div>
        <span className="text-amber-500 text-xs">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="border-t border-amber-500/20 px-4 pb-4 space-y-4 pt-3">
          {groups.map((g) => (
            <div key={g.bulan}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-editorial text-xs font-semibold text-skin-text2">
                  📅 Jatuh Tempo {fmtBulan(g.bulan + "-01")}
                </p>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{fmtRp(g.total)}</span>
              </div>
              <div className="space-y-1.5">
                {g.items.map((r) => (
                  <div key={r.id} className="bg-skin-raised border border-skin-bdr-lt px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-skin-text truncate">
                          {r.nama_bahan}{r.motif ? <span className="font-normal text-skin-text3"> / {r.motif}</span> : ""}
                        </p>
                        <p className="text-[11px] text-skin-text3">
                          Beli {fmtTanggalLengkap(r.tanggal)} · {r.jumlah} {r.satuan}
                        </p>
                        <p className="text-[11px] text-amber-500">
                          Tempo: {fmtTanggalLengkap(r.jatuh_tempo)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-skin-text shrink-0">{fmtRp(r.total_harga)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowShare(true)}
            className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-[#CAB170]/40 text-[#CAB170] hover:bg-[#CAB170]/10 transition"
          >
            📤 Bagikan ke WhatsApp
          </button>
        </div>
      )}

      {showShare && <ShareTagihanModal groups={groups} onClose={() => setShowShare(false)} />}
    </div>
  );
}
