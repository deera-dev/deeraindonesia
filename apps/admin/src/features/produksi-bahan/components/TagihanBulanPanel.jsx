import { useState } from "react";
import { fmtRp, fmtBulan, fmtTanggalLengkap, groupTagihanPerBulan, hargaSatuanEfektif } from "../utils";
import TagihanShareModal from "./TagihanShareModal";

const STATUS_STYLE = {
  belum: {
    title: "Tagihan per Bulan (Belum Lunas)",
    border: "border-amber-500/30",
    bg: "bg-skin-card",
    label: "text-amber-500",
    total: "text-amber-600 dark:text-amber-400",
    borderTop: "border-amber-500/20",
    tempo: "text-amber-500",
  },
  lunas: {
    title: "Riwayat Lunas per Bulan",
    border: "border-emerald-500/30",
    bg: "bg-skin-card",
    label: "text-emerald-500",
    total: "text-emerald-600 dark:text-emerald-400",
    borderTop: "border-emerald-500/20",
    tempo: "text-emerald-500",
  },
};

export default function TagihanBulanPanel({ items, status = "belum" }) {
  const [open, setOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const groups = groupTagihanPerBulan(items, status);
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.belum;

  if (!groups.length) return null;
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className={`mb-4 border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className={`font-editorial text-[10px] tracking-[0.2em] uppercase ${style.label}`}>
            {style.title}
          </p>
          <p className={`font-bold text-sm mt-0.5 ${style.total}`}>{fmtRp(grandTotal)}</p>
        </div>
        <span className={`text-xs ${style.label}`}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className={`border-t ${style.borderTop} px-4 pb-4 space-y-4 pt-3`}>
          {groups.map((g) => (
            <div key={g.bulan}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="font-editorial text-xs font-semibold text-skin-text2">
                  📅 Jatuh Tempo {fmtBulan(g.bulan + "-01")}
                </p>
                <span className={`font-bold text-sm ${style.total}`}>{fmtRp(g.total)}</span>
              </div>
              <div className="space-y-1.5">
                {g.items.map((r) => (
                  <div key={r.id} className="bg-skin-page border border-skin-bdr-lt px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-skin-text truncate">
                          {r.nama_bahan}{r.motif ? <span className="font-normal text-skin-text3"> / {r.motif}</span> : ""}
                        </p>
                        <p className="text-[11px] text-skin-text3">
                          Beli {fmtTanggalLengkap(r.tanggal)} ·{" "}
                          <span className={style.tempo}>Tempo: {fmtTanggalLengkap(r.jatuh_tempo)}</span>
                        </p>
                        <p className="text-[11px] text-skin-text4">
                          {fmtRp(hargaSatuanEfektif(r))}/{r.satuan} × {r.jumlah} {r.satuan}
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
            className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-skin-accent/40 text-skin-accent-text hover:bg-skin-accent/10 transition"
          >
            📤 Bagikan / Simpan
          </button>
        </div>
      )}

      {showShare && <TagihanShareModal groups={groups} onClose={() => setShowShare(false)} />}
    </div>
  );
}
