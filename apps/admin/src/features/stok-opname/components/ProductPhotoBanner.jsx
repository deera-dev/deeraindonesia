import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function ProductPhotoBanner({ image, kode }) {
  const [full, setFull] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setFull(true)}
        disabled={!image}
        className="w-full h-48 bg-skin-raised overflow-hidden flex-shrink-0 disabled:cursor-default"
      >
        {image ? (
          <img src={cldUrl(image, { width: 640 })} alt={kode} className="object-contain w-full h-full" />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-skin-text4 text-xs">Belum ada foto</span>
        )}
      </button>

      {full && image && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFull(false)}
        >
          <img src={cldUrl(image, { width: 1080 })} alt={kode} className="max-w-full max-h-full object-contain" />
          <button
            onClick={() => setFull(false)}
            aria-label="Tutup foto"
            className="absolute top-4 right-4 text-3xl text-white px-2"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
