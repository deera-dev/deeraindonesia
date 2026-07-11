/**
 * ScaleToFitPreview.jsx
 *
 * Membungkus preview dokumen berlebar tetap (mis. surat jalan, kartu share
 * gajian) yang akan di-capture ke PNG lewat html-to-image, supaya tampilannya
 * otomatis mengecil (CSS transform: scale) agar selalu pas di layar HP tanpa
 * horizontal scroll — TANPA mengubah lebar asli konten di DOM.
 *
 * PENTING soal ref untuk toPng(): pasang ref capture PNG pada elemen di
 * DALAM `children` (elemen dokumen aslinya), BUKAN pada ScaleToFitPreview
 * ini. html-to-image meng-clone node target berdasarkan offsetWidth/
 * offsetHeight miliknya sendiri (tidak terpengaruh transform milik leluhur),
 * jadi hasil capture tetap beresolusi penuh sesuai `contentWidth` walau
 * tampilan visualnya di layar sudah diperkecil.
 *
 * Props:
 * - contentWidth : number — lebar asli konten dalam px (mis. 600, 420)
 * - children     : node   — elemen dokumen asli (berisi ref toPng)
 */
import { useEffect, useRef, useState } from "react";

export default function ScaleToFitPreview({ contentWidth, children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const containerWidth = outer.clientWidth;
      const nextScale = containerWidth > 0 ? Math.min(1, containerWidth / contentWidth) : 1;
      setScale(nextScale);
      setNaturalHeight(inner.scrollHeight);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [contentWidth]);

  return (
    <div ref={outerRef} className="w-full">
      <div style={{ height: naturalHeight * scale || undefined }}>
        <div
          ref={innerRef}
          style={{
            width: contentWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
