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
import { fmtDate, STATUS_META, isWoSelesai } from "../utils";
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

export default function SampelCard({
  sampel,
  onEdit,
  onEditPlan,
  onDelete,
  onReview,
  onWoSampel,
  onLanjutWo,
  onApproveRepeat,
  onOpenDiscussion,
  onWorkOrder,
  onWoSelesai,
  unreadCount = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const meta = STATUS_META[sampel.status] ?? STATUS_META.draft;
  const fotos = sampel.foto ?? [];
  const isPlanning = sampel.status === "planning";
  const modelFotos = sampel.model_foto ?? [];
  const bahanItems = sampel.bahan_items ?? [];
  // Foto per-bahan (permintaan Denny 2026-09: "keseringan memang menggunakan
  // lebih dari 1 bahan") — planning LAMA (sebelum perubahan ini) hanya punya
  // 1 foto bahan generik di kolom `bahan_foto`, TANPA bahan_items sama
  // sekali ATAU dengan bahan_items tapi tanpa field foto per-item; kedua
  // kasus fallback ke bahan_foto supaya data lama tetap tampil fotonya.
  const bahanFotos =
    bahanItems.length > 0
      ? bahanItems.map((b, i) => b.foto ?? (i === 0 ? sampel.bahan_foto : null)).filter(Boolean)
      : [sampel.bahan_foto].filter(Boolean);
  const thumbUrl = isPlanning ? bahanFotos[0] ?? modelFotos[0] : fotos[0];

  // Galeri untuk lightbox: planning gabung SEMUA foto bahan + model, status
  // lain pakai `fotos` apa adanya. Dipetakan ke URL resolusi lebih tinggi
  // dari thumbnail (bukan crop 80-128px).
  // Non-planning: foto sampel dulu, lalu foto acuan (bahan + model) — foto yang
  // diupload saat Planning tidak boleh hilang setelah sampel disetujui
  // (Denny 2026-10-14: "foto cuma ada 1, padahal yang diupload banyak").
  const planningGallery = [...bahanFotos, ...modelFotos].filter(Boolean);
  const galleryUrls = isPlanning ? planningGallery : [...fotos, ...bahanFotos, ...modelFotos];
  const refCount = bahanFotos.length + modelFotos.length;
  const totalFoto = fotos.length + refCount;
  const selesai = isWoSelesai(sampel);
  const NEXT_STEP = {
    planning: sampel.is_repeat
      ? "Model sama dengan produk lama? Tekan Approve Repeat."
      : "Cetak WO Sampel, lalu lanjut ke Work Order.",
    draft: "Putuskan: setujui, tahan, atau tolak.",
    approved: selesai ? "Work Order sudah selesai." : "Buat Work Order untuk tukang potong.",
    ditahan: "Ditahan — tekan Tinjau Ulang kalau sudah siap.",
  };
  const nextStep = NEXT_STEP[sampel.status];
  const lightboxImages = galleryUrls.map((url) => cldUrl(url, { width: 1400 }));
  const bahanOffset = bahanFotos.length;

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
              {selesai && (
                <span className="text-[9px] font-editorial tracking-[0.1em] uppercase px-2 py-0.5 bg-emerald-600 text-white">
                  ✓ WO Selesai
                </span>
              )}
              {sampel.is_repeat && (
                <span className="text-[9px] font-editorial uppercase px-1.5 py-0.5 border border-sky-500/40 text-sky-600">
                  ↻ Repeat
                </span>
              )}
              {/* Pin/prioritaskan planning penting (permintaan Denny 2026-09) */}
              {sampel.pinned && (
                <span
                  title="Ditandai penting"
                  className="text-[9px] font-editorial uppercase px-1.5 py-0.5 border border-skin-accent/50 text-skin-accent-text bg-skin-gold"
                >
                  📌 Penting
                </span>
              )}
            </div>
            <p className="text-[10px] text-skin-text3 mt-0.5">
              {sampel.nomor} · {fmtDate(sampel.tanggal)}
            </p>
            {nextStep && <p className="text-[11px] text-skin-text2 mt-1">{nextStep}</p>}
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
        {isPlanning && bahanItems.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {bahanItems.map((b, i) => (
              <span
                key={`${b.nama_bahan}-${i}`}
                className="text-[10px] font-editorial px-1.5 py-0.5 bg-skin-raised text-skin-text2 border border-skin-bdr"
              >
                {b.nama_bahan}
              </span>
            ))}
          </div>
        )}

        {/* Planning: foto tiap bahan + model referensi — tap utk lihat full size */}
        {isPlanning && (bahanFotos.length > 0 || modelFotos.length > 0) && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {bahanFotos.map((url, i) => (
              <button
                type="button"
                key={`bahan-${url}-${i}`}
                onClick={() => setLightboxIndex(i)}
                className="relative w-16 h-20 border border-sky-500/40 overflow-hidden"
              >
                <img
                  src={cldUrl(url, { width: 128, height: 160, crop: "fill" })}
                  className="w-full h-full object-cover"
                  alt={`bahan ${i + 1}`}
                />
                <span className="absolute bottom-0 inset-x-0 text-center text-[7px] text-white bg-sky-600/80 font-editorial uppercase truncate px-0.5">
                  {bahanItems[i]?.nama_bahan || "Bahan"}
                </span>
                <ZoomHint />
              </button>
            ))}
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

        {/* Aksi utama (1 tombol besar, sesuai langkah berikutnya) */}
        {isPlanning && sampel.is_repeat && onApproveRepeat && (
          <button
            onClick={() => onApproveRepeat(sampel)}
            className="w-full py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 transition"
          >
            Approve Repeat (tanpa sampel baru)
          </button>
        )}
        {isPlanning && (
          <div className="flex gap-2">
            <button
              onClick={() => onWoSampel(sampel)}
              className="flex-1 py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-sky-500/50 text-sky-600 hover:bg-sky-500/10 transition"
            >
              Buat WO Sampel
            </button>
            <button
              onClick={() => onLanjutWo(sampel)}
              className="flex-[1.4] py-2.5 text-xs font-editorial tracking-[0.1em] uppercase bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Lanjut ke Work Order →
            </button>
          </div>
        )}
        {sampel.status === "draft" && (
          <button
            onClick={() => onReview(sampel)}
            className="w-full py-2.5 text-xs font-editorial tracking-[0.1em] uppercase bg-skin-accent text-skin-on-accent hover:bg-skin-accent-hover transition"
          >
            Review & Approval
          </button>
        )}
        {sampel.status === "ditahan" && (
          <button
            onClick={() => onReview(sampel)}
            className="w-full py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-amber-500/50 text-amber-600 hover:bg-amber-500/10 transition"
          >
            Tinjau Ulang
          </button>
        )}
        {sampel.status === "approved" && !selesai && (
          <div className="flex gap-2">
            <button
              onClick={() => onWorkOrder(sampel)}
              className="flex-[2] py-2.5 text-xs font-editorial tracking-[0.1em] uppercase bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Buat Work Order
            </button>
            {onWoSelesai && (
              <button
                onClick={() => onWoSelesai(sampel, true)}
                className="flex-1 py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 transition"
              >
                ✓ Selesai
              </button>
            )}
          </div>
        )}
        {selesai && (
          <div className="flex gap-2">
            <button
              onClick={() => onWorkOrder(sampel)}
              className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
            >
              Lihat Work Order
            </button>
            {onWoSelesai && (
              <button
                onClick={() => onWoSelesai(sampel, false)}
                className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
              >
                Kembalikan
              </button>
            )}
          </div>
        )}

        {/* Aksi pendukung */}
        <div className="flex gap-2">
          {!isPlanning && totalFoto > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="py-2 px-3 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
            >
              {expanded ? "Tutup" : `Foto (${totalFoto})`}
            </button>
          )}
          {/* Bulatan angka: jumlah komentar orang lain yang belum dibaca */}
          <button
            onClick={() => onOpenDiscussion(sampel)}
            className="relative flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text transition"
          >
            Catatan/Diskusi
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {onEditPlan && (
            <button
              onClick={() => onEditPlan(sampel)}
              title="Edit judul, bahan & foto acuan"
              className="py-2 px-3 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text transition"
            >
              ✎ Edit
            </button>
          )}
          {sampel.status === "draft" && (
            <button
              onClick={() => onEdit(sampel)}
              title="Edit foto sampel"
              className="py-2 px-3 text-xs border border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text transition"
            >
              ✎
            </button>
          )}
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
      {expanded && totalFoto > 0 && (
        <div className="border-t border-skin-bdr px-4 pb-4 pt-3 space-y-2">
          {fotos.length > 0 && (
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
          )}
          {fotos.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setFotoIdx(i)}
                  className={`w-16 h-20 border-2 overflow-hidden transition ${
                    i === fotoIdx ? "border-skin-accent" : "border-skin-bdr opacity-50"
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
          {refCount > 0 && (
            <div className="space-y-1 pt-1">
              <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Foto Acuan (bahan & model)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...bahanFotos, ...modelFotos].map((url, i) => (
                  <button
                    type="button"
                    key={`ref-${url}-${i}`}
                    onClick={() => setLightboxIndex(fotos.length + i)}
                    className="relative w-16 h-20 border border-skin-bdr overflow-hidden"
                  >
                    <img
                      src={cldUrl(url, { width: 128, height: 160, crop: "fill" })}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                    <span className="absolute bottom-0 inset-x-0 text-center text-[7px] text-white bg-black/50 font-editorial uppercase">
                      {i < bahanFotos.length ? "Bahan" : "Model"}
                    </span>
                    <ZoomHint />
                  </button>
                ))}
              </div>
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
