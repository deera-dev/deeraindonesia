import { useState } from "react";
import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";

export default function KasbonCard({ k, onEdit, onCicilan, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const persen = k.jumlah > 0 ? Math.round(((k.jumlah - k.sisa) / k.jumlah) * 100) : 0;

  // Gabungkan riwayat pembayaran cicilan & riwayat penambahan pinjaman jadi satu timeline.
  const riwayat = [
    ...(k.cicilan ?? []).map((c) => ({ ...c, jenis: "bayar" })),
    ...(k.tambahan ?? []).map((t) => ({ ...t, jenis: "tambah" })),
  ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return (
    <div className={`bg-skin-card border ${k.status === "lunas" ? "border-emerald-500/30" : "border-skin-bdr"} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-editorial text-sm font-semibold text-skin-text">{k.karyawan?.nama ?? "—"}</p>
            <span className={`font-editorial text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 border ${
              k.status === "lunas" ? "border-emerald-500/40 text-emerald-500" : "border-amber-400/40 text-amber-400"
            }`}>
              {k.status}
            </span>
          </div>
          <p className="font-editorial text-xs text-skin-text3 mt-0.5">{fmtTanggalPendek(k.tanggal)}</p>
          {k.keterangan && <p className="font-editorial text-xs text-skin-text3">{k.keterangan}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="font-editorial text-xs text-skin-text3">Sisa</p>
          <p className={`font-numeric text-base leading-none ${k.status === "lunas" ? "text-emerald-500" : "text-amber-500"}`}>{fmtRp(k.sisa)}</p>
          <p className="font-editorial text-xs text-skin-text4 mt-0.5">dari <span className="font-numeric">{fmtRp(k.jumlah)}</span></p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-skin-raised rounded-full overflow-hidden">
        <div className="h-full bg-[#CAB170] rounded-full transition-all" style={{ width: `${persen}%` }} />
      </div>
      <p className="font-editorial text-[10px] text-skin-text4 mt-1">{persen}% terbayar</p>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {k.status !== "lunas" && (
          <button onClick={() => onCicilan(k)} className="font-editorial text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 border border-[#CAB170] text-[#CAB170] hover:bg-skin-gold transition">
            + Bayar Cicilan
          </button>
        )}
        <button onClick={() => setExpanded((v) => !v)} className="font-editorial text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 border border-skin-bdr text-skin-text3 hover:border-skin-text transition">
          {expanded ? "Tutup" : `Riwayat (${riwayat.length})`}
        </button>
        <button onClick={() => onEdit(k)} className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3 hover:text-[#CAB170] transition">Edit</button>
        <button onClick={() => onDelete(k.id)} className="font-editorial text-[10px] uppercase tracking-wide text-red-400 hover:text-red-600 transition">Hapus</button>
      </div>

      {/* Riwayat: cicilan (pembayaran) & tambahan (penambahan pinjaman) */}
      {expanded && riwayat.length > 0 && (
        <div className="mt-3 border-t border-skin-bdr-lt pt-3 space-y-1.5">
          {riwayat.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div>
                <p className="font-editorial text-xs text-skin-text2">
                  {fmtTanggalPendek(r.tanggal)}{" "}
                  <span className={`text-[10px] uppercase tracking-wide ${r.jenis === "tambah" ? "text-amber-500" : "text-emerald-500"}`}>
                    {r.jenis === "tambah" ? "· tambahan" : "· bayar"}
                  </span>
                </p>
                {r.keterangan && <p className="font-editorial text-[10px] text-skin-text3">{r.keterangan}</p>}
              </div>
              <p className={`font-editorial text-sm shrink-0 ${r.jenis === "tambah" ? "text-amber-500" : "text-emerald-500"}`}>
                {r.jenis === "tambah" ? "+" : "−"}<span className="font-numeric">{fmtRp(r.jumlah)}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      {expanded && riwayat.length === 0 && (
        <p className="mt-3 font-editorial text-xs text-skin-text3 pt-3 border-t border-skin-bdr-lt">Belum ada riwayat.</p>
      )}
    </div>
  );
}
