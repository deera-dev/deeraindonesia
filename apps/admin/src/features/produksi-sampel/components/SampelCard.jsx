/**
 * SampelCard.jsx
 * Draft   → "Review" (buka approval modal) · edit · hapus
 * Approved/Rejected → tampil info, expand foto
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { fmtDate, STATUS_META } from "../utils";

export default function SampelCard({ sampel, onEdit, onDelete, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);

  const meta = STATUS_META[sampel.status] ?? STATUS_META.draft;
  const fotos = sampel.foto ?? [];

  return (
    <div className="bg-skin-card border border-skin-bdr">
      {/* ── Header ── */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          {fotos.length > 0 && (
            <div className="shrink-0 w-10 h-14 border border-skin-bdr overflow-hidden">
              <img
                src={cldUrl(fotos[0], { width: 80, height: 112, crop: "fill" })}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-skin-text">{sampel.nama}</p>
              <span className={`text-[9px] font-editorial tracking-[0.1em] uppercase px-2 py-0.5 ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-[10px] text-skin-text3 mt-0.5">
              {sampel.nomor} · {fmtDate(sampel.tanggal)}
            </p>
            {sampel.status === "approved" && (
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {sampel.perubahan ? "Ada perubahan · " : "Sesuai sampel · "}
                disetujui oleh {sampel.approved_by ?? "-"}
              </p>
            )}
            {sampel.status === "rejected" && sampel.rejection_note && (
              <p className="text-[10px] text-red-400 mt-0.5 truncate">
                Ditolak: {sampel.rejection_note}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          {/* Foto toggle */}
          {fotos.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="py-2 px-3 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
            >
              {expanded ? "Tutup" : `Foto (${fotos.length})`}
            </button>
          )}
          {/* Draft: tombol review */}
          {sampel.status === "draft" && (
            <button
              onClick={() => onReview(sampel)}
              className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-[#CAB170]/50 text-[#CAB170] hover:bg-skin-gold transition"
            >
              Review & Approval
            </button>
          )}
          {/* Edit (draft only) */}
          {sampel.status === "draft" && (
            <button
              onClick={() => onEdit(sampel)}
              title="Edit"
              className="py-2 px-3 text-xs border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              ✎
            </button>
          )}
          {/* Hapus */}
          <button
            onClick={() => onDelete(sampel)}
            title="Hapus"
            className="py-2 px-3 text-xs border border-skin-bdr text-red-400 hover:text-red-600 transition"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Foto expanded ── */}
      {expanded && fotos.length > 0 && (
        <div className="border-t border-skin-bdr px-4 pb-4 pt-3 space-y-2">
          <img
            src={cldUrl(fotos[fotoIdx], { width: 700 })}
            className="w-full max-h-72 object-contain bg-skin-raised border border-skin-bdr"
            alt={`foto ${fotoIdx + 1}`}
          />
          {fotos.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setFotoIdx(i)}
                  className={`w-12 h-16 border-2 overflow-hidden transition ${
                    i === fotoIdx ? "border-[#CAB170]" : "border-skin-bdr opacity-50"
                  }`}
                >
                  <img
                    src={cldUrl(url, { width: 96, height: 128, crop: "fill" })}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </button>
              ))}
            </div>
          )}
          {sampel.status === "approved" && sampel.perubahan && (
            <div className="mt-2 space-y-1">
              <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Catatan Perubahan
              </p>
              <p className="text-xs text-skin-text bg-amber-500/5 border border-amber-500/20 px-3 py-2 whitespace-pre-wrap">
                {sampel.perubahan}
              </p>
            </div>
          )}
          {sampel.status === "rejected" && sampel.rejection_note && (
            <div className="mt-2 space-y-1">
              <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Alasan Penolakan
              </p>
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 px-3 py-2 whitespace-pre-wrap">
                {sampel.rejection_note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
