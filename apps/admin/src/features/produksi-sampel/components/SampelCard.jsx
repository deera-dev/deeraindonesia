import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { fmtDate, STATUS_META, isWoSelesai, isSedangDibuat } from "../utils";
import PhotoLightbox from "../../../shared/components/PhotoLightbox";

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

const ICON_PATHS = {
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12Z" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /></>,
  back: <><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  next: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m5 12 5 5 9-10" />,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
};

const TONES = {
  default: "border border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text",
  active: "border border-skin-accent text-skin-accent-text bg-skin-gold",
  danger: "border border-skin-bdr text-red-400 hover:text-red-600 hover:border-red-300",
  primary: "bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700",
  "ok-outline": "border border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10",
};

function IconBtn({ label, onClick, icon, tone = "default", active = false, badge = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative shrink-0 w-10 h-10 flex items-center justify-center transition active:scale-95 ${TONES[active ? "active" : tone]}`}
    >
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATHS[icon]}
      </svg>
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default function SampelCard({
  sampel,
  onEdit,
  onEditPlan,
  onDelete,
  onReview,
  onWoSampel,
  onSampelJadi,
  onApproveRepeat,
  onOpenDiscussion,
  onWorkOrder,
  onWoSelesai,
  onMundur,
  unreadCount = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const sedangDibuat = isSedangDibuat(sampel);
  const meta = STATUS_META[sedangDibuat ? "sedang_dibuat" : sampel.status] ?? STATUS_META.draft;
  const fotos = sampel.foto ?? [];
  const mundurLabel = isWoSelesai(sampel)
    ? "Kembali ke Work Order"
    : sampel.status === "approved"
      ? "Kembali ke Sampel"
      : sampel.status === "draft" || sedangDibuat
        ? "Kembali ke Rencana"
        : null;
  const isPlanning = sampel.status === "planning";
  const modelFotos = sampel.model_foto ?? [];
  const bahanItems = sampel.bahan_items ?? [];
  const bahanFotos =
    bahanItems.length > 0
      ? bahanItems.map((b, i) => b.foto ?? (i === 0 ? sampel.bahan_foto : null)).filter(Boolean)
      : [sampel.bahan_foto].filter(Boolean);
  const thumbUrl = isPlanning ? bahanFotos[0] ?? modelFotos[0] : fotos[0];

  const planningGallery = [...bahanFotos, ...modelFotos].filter(Boolean);
  const galleryUrls = isPlanning ? planningGallery : [...fotos, ...bahanFotos, ...modelFotos];
  const refCount = bahanFotos.length + modelFotos.length;
  const totalFoto = fotos.length + refCount;
  const selesai = isWoSelesai(sampel);
  const lightboxImages = galleryUrls.map((url) => cldUrl(url, { width: 1400 }));
  const bahanOffset = bahanFotos.length;

  return (
    <div className="bg-skin-card border border-skin-bdr">
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

        <div className="flex items-center gap-1.5 pt-1">
          {!isPlanning && totalFoto > 0 && (
            <IconBtn
              label={expanded ? "Tutup foto" : `Foto (${totalFoto})`}
              onClick={() => setExpanded((v) => !v)}
              active={expanded}
              icon="image"
            />
          )}
          <IconBtn label="Diskusi" onClick={() => onOpenDiscussion(sampel)} icon="chat" badge={unreadCount} />
          {onEditPlan && isPlanning && (
            <IconBtn label="Edit judul, bahan & foto acuan" onClick={() => onEditPlan(sampel)} icon="edit" />
          )}
          {sampel.status === "draft" && (
            <IconBtn label="Edit foto sampel" onClick={() => onEdit(sampel)} icon="edit" />
          )}
          <IconBtn label="Hapus" onClick={() => onDelete(sampel)} icon="trash" tone="danger" />

          <span className="flex-1" />

          {onMundur && mundurLabel && (
            <IconBtn label={mundurLabel} onClick={() => onMundur(sampel)} icon="back" />
          )}
          {isPlanning && sampel.is_repeat && !sedangDibuat && onApproveRepeat && (
            <IconBtn label="Approve Repeat" onClick={() => onApproveRepeat(sampel)} icon="repeat" tone="ok-outline" />
          )}
          {isPlanning && sedangDibuat && (
            <IconBtn label="WO Sampel" onClick={() => onWoSampel(sampel)} icon="doc" />
          )}
          {sampel.status === "approved" && (
            <IconBtn label={selesai ? "Lihat Work Order" : "Buat Work Order"} onClick={() => onWorkOrder(sampel)} icon="doc" />
          )}
          {isPlanning && !sedangDibuat && (
            <IconBtn label="Buat WO Sampel" onClick={() => onWoSampel(sampel)} icon="next" tone="primary" />
          )}
          {isPlanning && sedangDibuat && (
            <IconBtn label="Sampel Sudah Jadi" onClick={() => onSampelJadi(sampel)} icon="check" tone="primary" />
          )}
          {sampel.status === "draft" && (
            <IconBtn label="Review & Approval" onClick={() => onReview(sampel)} icon="check" tone="primary" />
          )}
          {sampel.status === "ditahan" && (
            <IconBtn label="Tinjau Ulang" onClick={() => onReview(sampel)} icon="next" tone="primary" />
          )}
          {sampel.status === "approved" && !selesai && onWoSelesai && (
            <IconBtn label="Tandai WO Selesai" onClick={() => onWoSelesai(sampel, true)} icon="check" tone="primary" />
          )}
        </div>
      </div>

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
          {sampel.status === "approved" && (sampel.wo_sizes?.length > 0 || sampel.wo_catatan) && (
            <div className="mt-2 space-y-1">
              <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Work Order Terakhir
              </p>
              {sampel.wo_sizes?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sampel.wo_sizes.map((sz) => (
                    <span
                      key={sz}
                      className="text-[10px] font-editorial px-1.5 py-0.5 border border-skin-accent/50 text-skin-accent-text"
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              )}
              {sampel.wo_catatan && (
                <p className="text-xs text-skin-text bg-skin-raised border border-skin-bdr px-3 py-2 whitespace-pre-wrap">
                  {sampel.wo_catatan}
                </p>
              )}
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
