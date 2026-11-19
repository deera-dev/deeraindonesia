import { useRef, useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

const MIN_RECT = 0.03;

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function rectFromPoints(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);
  return { x, y, width, height };
}

export default function ZonaCropModal({ zonaLabel, photos, initialUrl, initialCrop, onConfirm, onCancel }) {
  const [url, setUrl] = useState(initialUrl ?? (photos.length === 1 ? photos[0] : null));
  const [rect, setRect] = useState(initialCrop ?? null);
  const [dragStart, setDragStart] = useState(null);
  const imgRef = useRef(null);

  function pointFromEvent(e) {
    const box = imgRef.current.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - box.left) / box.width),
      y: clamp01((e.clientY - box.top) / box.height),
    };
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = pointFromEvent(e);
    setDragStart(p);
    setRect(null);
  }

  function handlePointerMove(e) {
    if (!dragStart) return;
    const p = pointFromEvent(e);
    setRect(rectFromPoints(dragStart, p));
  }

  function handlePointerUp() {
    setDragStart(null);
    setRect((r) => (r && r.width >= MIN_RECT && r.height >= MIN_RECT ? r : null));
  }

  function handleConfirm() {
    if (!url || !rect) return;
    onConfirm({ url, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative bg-skin-card w-full max-w-lg mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl flex flex-col h-[100dvh] md:h-auto md:max-h-[90dvh]">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b-2 border-skin-bdr">
          <h3 className="text-skin-accent-text text-lg font-headline leading-none">
            Potongan Foto — {zonaLabel}
          </h3>
          <button onClick={onCancel} className="text-skin-text3 hover:text-red-500 transition text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          {!url ? (
            <>
              <p className="text-xs text-skin-text3 mb-2">Pilih foto untuk dipotong:</p>
              <div className="flex flex-wrap gap-2" data-testid="zona-crop-foto-picker">
                {photos.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setUrl(p)}
                    className="w-16 h-20 border-2 border-skin-bdr hover:border-skin-accent overflow-hidden"
                  >
                    <img
                      src={cldUrl(p, { width: 128, height: 160, crop: "fill" })}
                      alt={`foto ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-skin-text3 mb-2">
                Tahan &amp; geser di atas foto untuk menandai bagian {zonaLabel.toLowerCase()}.
              </p>
              <div
                ref={imgRef}
                className="relative select-none touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                data-testid="zona-crop-stage"
              >
                <img src={cldUrl(url, { width: 700 })} alt={zonaLabel} className="w-full h-auto block pointer-events-none" draggable={false} />
                {rect && (
                  <div
                    data-testid="zona-crop-rect"
                    className="absolute border-2 border-skin-accent bg-skin-accent/25"
                    style={{
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.width * 100}%`,
                      height: `${rect.height * 100}%`,
                    }}
                  />
                )}
              </div>
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl(null);
                    setRect(null);
                  }}
                  className="mt-2 text-xs text-skin-accent-text underline"
                >
                  Ganti foto
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 border-t-2 border-skin-bdr p-3 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 border border-skin-bdr hover:text-skin-text transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!url || !rect}
            className="flex-1 py-3 text-sm tracking-[0.1em] uppercase font-semibold bg-skin-accent text-skin-on-accent hover:bg-skin-accent-hover transition disabled:opacity-40"
          >
            Pakai Potongan Ini
          </button>
        </div>
      </div>
    </div>
  );
}
