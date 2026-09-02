/**
 * SampelCard.jsx
 * Planning → foto bahan + model referensi, tombol "Tandai Sudah Dibuat" · hapus
 * Draft (Menunggu Review) → "Review & Approval" · edit · hapus
 * Approved/Rejected → tampil info, expand foto
 * Ditahan → tampil catatan, tombol "Tinjau Ulang" (buka lagi approval modal)
 *
 * Semua foto bisa diklik untuk lihat full-size via PhotoLightbox (permintaan
 * Denny 2026-08: "tiap foto bisa di klik untuk lihat secara full size,
 * karena lebih sering terlihat dari handphone"). Thumbnail juga diperbesar
 * sedikit (dari w-12/w-10 ke w-16/w-12) supaya tap target lebih nyaman di
 * mobile, dengan ikon kaca pembesar kecil sebagai penanda visual bisa diklik.
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { fmtDate, STATUS_META } from "../utils";
import PhotoLightbox from "../../../shared/components/PhotoLightbox";

// Ikon kaca pembesar kecil — penanda visual "bisa diklik untuk full size",
// selalu tampil (bukan cuma on-hover) supaya kelihatan juga di layar sentuh.
function ZoomHint() {
  return (
    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-black/45 flex items-center justify-center pointer-events-none">
      <svg viewBox="0 0 20 20" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <line x1="16" y1="16" x2="12.5" y2="12.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function SampelCard({ sampel, onEdit, onDelete, onReview, onMarkDibuat, onOpenDiscussion }) {
  const [expanded, setExpanded] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const meta = STATUS_META[sampel.status] ?? STATUS_META.draft;
  const fotos = sampel.foto ?? [];
  const isPlanning = sampel.status === "planning";
  const modelFotos = sampel.model_foto ?? [];
  const thumbUrl = isPlanning ? sampel.bahan_foto ?? modelFotos[0] : fotos[0];

  // Galeri untuk lightbox: planning gabung bahan+model (bahan selalu index 0
  // kalau ada), status lain pakai `fotos` apa adanya. Dipetakan ke URL
  // resolusi lebih tinggi dari thumbnail (bukan crop 80-128px).
  const planningGallery = [sampel.bahan_foto, ...modelFotos].filter(Boolean);
  const galleryUrls = isPlanning ? planningGallery : fotos;
  const lightboxImages = galleryUrls.map((url) => cldUrl(url, { width: 1400 }));
  const bahanOffset = sampel.bahan_foto ? 1 : 0;

  return (
    <div className="bg-skin-card border border-skin-bdr">
      {/* ── Header ── */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          {thumbUrl && (
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="relative shrink-0 w-12 h-16 border border-skin-bdr overflow-hidden"
            >
              <img
                src={cldUrl(thumbUrl, { width: 96, height: 128, crop: "fill" })}
                className="w-full h-full object-cover"
                alt=""
              />
              <ZoomHint />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-skin-text">{sampel.nama}</p>
              <span className={`text-[9px] font-editorial tracking-[0.1em] uppercase px-2 py-0.5 ${meta.cls}`}>
                {meta.label}
              </span>
              {/* Pin/prioritaskan planning penting (permintaan Denny 2026-09) */}
              {sampel.pinned && (
                <span
                  title="Ditandai penting"
                  className="text-[9px] font-editorial uppercase px-1.5 py-0.5 border border-[#CAB170]/50 text-[#CAB170] bg-skin-gold"
                >
                  📌 Penting
                </span>
              )}
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
            {sampel.status === "ditahan" && (
              <p className="text-[10px] text-amber-500 mt-0.5 truncate">
                {sampel.ditahan_note ? `Catatan: ${sampel.ditahan_note}` : "Ditahan untuk ditinjau lagi"}
              </p>
            )}
          </div>
        </div>

        {/* Planning: chip bahan yang direncanakan (dari list bahan, bukan teks bebas) */}
        {isPlanning && (sampel.bahan_items ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {sampel.bahan_items.map((b, i) => (
              <span
                key={`${b.nama_bahan}-${i}`}
                className="text-[10px] font-editorial px-1.5 py-0.5 bg-skin-raised text-skin-text2 border border-skin-bdr"
              >
                {b.nama_bahan}
              </span>
            ))}
          </div>
        )}

        {/* Planning: foto bahan + model referensi — tap utk lihat full size */}
        {isPlanning && (sampel.bahan_foto || modelFotos.length > 0) && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {sampel.bahan_foto && (
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="relative w-16 h-20 border border-sky-500/40 overflow-hidden"
              >
                <img
                  src={cldUrl(sampel.bahan_foto, { width: 128, height: 160, crop: "fill" })}
                  className="w-full h-full object-cover"
                  alt="bahan"
                />
                <span className="absolute bottom-0 inset-x-0 text-center text-[7px] text-white bg-sky-600/80 font-editorial uppercase">
                  Bahan
                </span>
                <ZoomHint />
              </button>
            )}
            {modelFotos.map((url, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setLightboxIndex(bahanOffset + i)}
                className="relative w-16 h-20 border border-skin-bdr overflow-hidden"
              >
                <img
                  src={cldUrl(url, { width: 128, height: 160, crop: "fill" })}
                  className="w-full h-full object-cover"
                  alt={`model ${i + 1}`}
                />
                <span className="absolute bottom-0 inset-x-0 text-center text-[7px] text-white bg-black/50 font-editorial uppercase">
                  Model {i + 1}
                </span>
                <ZoomHint />
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          {/* Foto toggle (draft/approved/rejected — pakai `foto`, bukan planning) */}
          {!isPlanning && fotos.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="py-2 px-3 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
            >
              {expanded ? "Tutup" : `Foto (${fotos.length})`}
            </button>
          )}
          {/* Planning: tombol Tandai Sudah Dibuat — icon saja (permintaan
              Denny 2026-09: "tandai sudah dibuat dijadiin icon aja") */}
          {isPlanning && (
            <button
              onClick={() => onMarkDibuat(sampel)}
              title="Tandai Sudah Dibuat"
              className="py-2 px-3 text-xs border border-sky-500/50 text-sky-600 hover:bg-sky-500/10 transition"
            >
              ✓
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
          {/* Ditahan: tombol tinjau ulang */}
          {sampel.status === "ditahan" && (
            <button
              onClick={() => onReview(sampel)}
              className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-amber-500/50 text-amber-600 hover:bg-amber-500/10 transition"
            >
              Tinjau Ulang
            </button>
          )}
          {/* Diskusi/komentar — button text, bukan icon (permintaan Denny
              2026-09: "chat dijadiin button text aja jangan icon, textnya
              catatan/diskusi") */}
          <button
            onClick={() => onOpenDiscussion(sampel)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
          >
            Catatan/Diskusi
          </button>
          {/* Edit (draft only — planning belum punya form edit terpisah) */}
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
          <button
            type="button"
            onClick={() => setLightboxIndex(fotoIdx)}
            className="relative block w-full"
          >
            <img
              src={cldUrl(fotos[fotoIdx], { width: 700 })}
              className="w-full max-h-72 object-contain bg-skin-raised border border-skin-bdr"
              alt={`foto ${fotoIdx + 1}`}
            />
            <ZoomHint />
          </button>
          {fotos.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setFotoIdx(i)}
                  className={`w-16 h-20 border-2 overflow-hidden transition ${
                    i === fotoIdx ? "border-[#CAB170]" : "border-skin-bdr opacity-50"
                  }`}
                >
                  <img
                    src={cldUrl(url, { width: 128, height: 160, crop: "fill" })}
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

      <PhotoLightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(delta) =>
          setLightboxIndex((i) => Math.min(Math.max((i ?? 0) + delta, 0), lightboxImages.length - 1))
        }
      />
    </div>
  );
}
