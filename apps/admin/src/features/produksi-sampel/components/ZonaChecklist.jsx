import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { WO_ZONA, MOTIF_OPTIONS } from "../utils";
import ZonaCropModal from "./ZonaCropModal";

const MOTIF_CAPSULE_CLS = {
  motif: "bg-amber-500 border-amber-500 text-white",
  polos: "bg-slate-600 border-slate-600 text-white",
};

export default function ZonaChecklist({ zona, onChange, photos = [], disabled = false }) {
  const [cropZonaKey, setCropZonaKey] = useState(null);

  const cropTarget = WO_ZONA.find((z) => z.key === cropZonaKey);

  function setCatatan(key, catatan) {
    onChange(key, { ...zona[key], catatan });
  }

  function setCrop(key, crop) {
    onChange(key, { ...zona[key], crop });
  }

  function removeCrop(key) {
    setCrop(key, null);
  }

  function setMotif(key, motif) {
    onChange(key, { ...zona[key], motif: zona[key]?.motif === motif ? null : motif });
  }

  return (
    <div>
      <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 mb-1.5">
        Catatan Potong per Bagian
      </p>
      <div className="space-y-2">
        {WO_ZONA.map((z) => {
          const entry = zona[z.key] ?? { catatan: "", crop: null, motif: null };
          return (
            <div key={z.key} className="flex items-start gap-2" data-testid={`zona-row-${z.key}`}>
              <div className="w-20 h-24 flex-shrink-0">
                {entry.crop ? (
                  <button
                    type="button"
                    onClick={() => !disabled && setCropZonaKey(z.key)}
                    disabled={disabled}
                    className="relative w-full h-full border-2 border-skin-accent overflow-hidden"
                    title="Ganti potongan foto"
                  >
                    <img
                      src={cldUrl(entry.crop.url, {
                        width: 160,
                        cropX: entry.crop.x,
                        cropY: entry.crop.y,
                        cropWidth: entry.crop.width,
                        cropHeight: entry.crop.height,
                      })}
                      alt={`potongan ${z.label}`}
                      className="w-full h-full object-cover"
                    />
                    <span
                      role="button"
                      aria-label={`Hapus potongan foto ${z.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCrop(z.key);
                      }}
                      className="absolute top-0 right-0 w-4 h-4 bg-black/60 text-white text-[10px] flex items-center justify-center leading-none"
                    >
                      ×
                    </span>
                  </button>
                ) : (
                  photos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCropZonaKey(z.key)}
                      disabled={disabled}
                      className="w-full h-full border border-dashed border-skin-bdr text-skin-text4 text-[9px] uppercase tracking-tight flex items-center justify-center text-center leading-tight px-0.5 hover:border-skin-accent hover:text-skin-accent-text transition disabled:opacity-40"
                    >
                      + Foto
                    </button>
                  )
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[10px] font-editorial uppercase tracking-[0.1em] text-skin-text2">
                    {z.label}
                  </p>
                  <div className="flex gap-1" data-testid={`zona-motif-${z.key}`}>
                    {MOTIF_OPTIONS.map((opt) => {
                      const active = entry.motif === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setMotif(z.key, opt.key)}
                          disabled={disabled}
                          className={`px-2.5 py-0.5 rounded-full border-2 text-[10px] font-bold uppercase tracking-wide transition disabled:opacity-40 ${
                            active
                              ? MOTIF_CAPSULE_CLS[opt.key]
                              : "border-skin-bdr text-skin-text3 hover:border-skin-accent"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  rows={1}
                  value={entry.catatan}
                  onChange={(e) => setCatatan(z.key, e.target.value)}
                  disabled={disabled}
                  placeholder="Sama seperti foto patokan"
                  className="w-full px-2 py-1.5 bg-skin-raised border border-skin-bdr text-sm text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-skin-accent transition resize-none disabled:opacity-40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {cropTarget && (
        <ZonaCropModal
          zonaLabel={cropTarget.label}
          photos={photos}
          initialUrl={zona[cropTarget.key]?.crop?.url}
          initialCrop={zona[cropTarget.key]?.crop}
          onCancel={() => setCropZonaKey(null)}
          onConfirm={(crop) => {
            setCrop(cropTarget.key, crop);
            setCropZonaKey(null);
          }}
        />
      )}
    </div>
  );
}
