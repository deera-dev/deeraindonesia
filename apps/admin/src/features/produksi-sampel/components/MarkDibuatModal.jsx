/**
 * MarkDibuatModal.jsx — "Tandai Sudah Dibuat"
 * Dipakai dari kartu Planning: sampel fisik sudah selesai dijahit dari bahan
 * & referensi model yang direncanakan. Admin upload foto sampel jadi (bisa
 * lebih dari satu), lalu status berpindah planning → draft ("Menunggu
 * Review") lewat markSampelDibuat(). Setelah ini, flow Review & Approval
 * yang sudah ada (DecisionCard di ProduksiSampelPage) dipakai apa adanya.
 */
import { useState } from "react";
import { uploadMedia, friendlyMediaErrorMessage } from "@deera/shared/lib/mediaUpload";
import PhotoLightbox from "../../../shared/components/PhotoLightbox";

function mkId() { return Math.random().toString(36).slice(2, 9); }

// Tap foto (bukan tombol ×) buka full-size, bisa geser antar foto dalam
// grid yang sama — permintaan Denny 2026-08: "tiap foto bisa di klik untuk
// lihat secara full size".
function FotoGrid({ fotos, onAdd, onRemove }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const images = fotos.map((f) => f.preview ?? f.url);

  function handleInput(e) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onAdd(files);
    e.target.value = "";
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {fotos.map((f, i) => (
        <div key={f.id} className="relative aspect-[3/4] border border-skin-bdr overflow-hidden bg-skin-raised">
          <img
            src={f.preview ?? f.url}
            onClick={() => setLightboxIndex(i)}
            className={`w-full h-full object-cover cursor-zoom-in ${f.type === "uploading" || f.type === "compressing" ? "opacity-60" : ""}`}
            alt=""
          />
          {f.type === "compressing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <p className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 font-editorial animate-pulse">
                Compressing...
              </p>
            </div>
          )}
          {f.type === "uploading" && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="h-1 bg-black/30">
                <div className="h-full bg-[#CAB170] transition-all duration-150" style={{ width: `${f.pct}%` }} />
              </div>
              <p className="text-center text-[9px] text-white bg-black/50 py-0.5 font-editorial">{f.pct}%</p>
            </div>
          )}
          {f.type === "done" && (
            <div className="absolute top-1 left-1 w-4 h-4 bg-emerald-500 flex items-center justify-center rounded-sm">
              <span className="text-white text-[9px] leading-none">✓</span>
            </div>
          )}
          {f.type === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 p-1">
              <p className="text-[9px] text-red-400 font-editorial text-center leading-tight">
                {f.errMsg || "Gagal upload"}
              </p>
            </div>
          )}
          {f.type !== "uploading" && f.type !== "compressing" && (
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <label className="flex aspect-[3/4] items-center justify-center border-2 border-dashed border-skin-bdr hover:border-[#CAB170] cursor-pointer flex-col gap-1 text-skin-text3 hover:text-[#CAB170] transition">
        <span className="text-2xl leading-none">+</span>
        <span className="font-editorial text-[10px] tracking-[0.1em] uppercase">Foto</span>
        <input type="file" accept="image/*" multiple onChange={handleInput} className="hidden" />
      </label>

      <PhotoLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(delta) =>
          setLightboxIndex((i) => Math.min(Math.max((i ?? 0) + delta, 0), images.length - 1))
        }
      />
    </div>
  );
}

export default function MarkDibuatModal({ sampel, onSave, onClose, saving }) {
  const [fotos, setFotos] = useState([]);

  function addFiles(files) {
    const newItems = files.map((file) => ({
      id: mkId(), type: "ready", preview: URL.createObjectURL(file), pct: 0,
    }));
    setFotos((prev) => [...prev, ...newItems]);
    newItems.forEach(({ id }, idx) => {
      uploadMedia(files[idx], {
        kind: "image",
        onProgress: (pct) =>
          setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, type: "uploading", pct } : f))),
        onStatus: (status) =>
          setFotos((prev) =>
            prev.map((f) =>
              f.id === id && (status === "compressing" || status === "uploading") ? { ...f, type: status } : f,
            ),
          ),
      })
        .then((result) =>
          setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, type: "done", url: result.url } : f))),
        )
        .catch((err) =>
          setFotos((prev) =>
            prev.map((f) => (f.id === id ? { ...f, type: "error", errMsg: friendlyMediaErrorMessage(err) } : f)),
          ),
        );
    });
  }

  const isBusyFoto = (f) => f.type === "uploading" || f.type === "compressing";
  const isUploading = fotos.some(isBusyFoto);
  const doneUrls = fotos.filter((f) => f.type === "done").map((f) => f.url);
  const canSubmit = doneUrls.length > 0 && !isUploading;

  function handleSubmit() {
    if (!canSubmit) return;
    onSave(doneUrls);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[85dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <div>
            <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
              Tandai Sudah Dibuat
            </h2>
            <p className="text-[10px] text-skin-text3 mt-0.5">{sampel.nama}</p>
          </div>
          <button onClick={onClose} className="text-skin-text3 hover:text-skin-text text-xl leading-none transition">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <p className="text-xs text-skin-text3">
            Upload foto sampel fisik yang sudah jadi. Sampel akan masuk antrean
            Review & Approval setelah ini.
          </p>
          <FotoGrid
            fotos={fotos}
            onAdd={addFiles}
            onRemove={(id) => setFotos((prev) => prev.filter((f) => f.id !== id))}
          />
        </div>

        <div className="shrink-0 border-t border-skin-bdr-lt px-4 py-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-text transition disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="flex-[2] py-2.5 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] disabled:opacity-50 transition"
          >
            {saving ? "Menyimpan..." : "Tandai Sudah Dibuat"}
          </button>
        </div>
      </div>
    </div>
  );
}
