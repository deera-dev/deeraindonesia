import { geocodeAddressMulti } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import { buildGeocodeQueries, useSetTokoLocationMutation, parseSosmed, buildGmapsPlaceUrl } from "../hooks";
import SosmedLinks from "../../../shared/components/SosmedLinks";

export default function PetaTokoChecklist({ tokoList, selected, onToggle }) {
  const setTokoLocation = useSetTokoLocationMutation();

  async function handleCariTitik(t) {
    try {
      const loc = await geocodeAddressMulti(buildGeocodeQueries(t));
      if (!loc) {
        toast.error(
          `Lokasi "${t.nama}" tidak ketemu — coba sederhanakan alamat (cukup nama jalan & kota), atau geser pin manual langsung di peta.`,
        );
        return;
      }
      await setTokoLocation.mutateAsync({ id: t.id, ...loc, source: "auto" });
    } catch (err) {
      toast.error(err.message ?? "Gagal mencari titik lokasi.");
    }
  }

  if (tokoList.length === 0) {
    return <p className="text-sm text-skin-text4 py-6 text-center px-4">Tidak ada toko utk daerah ini.</p>;
  }

  return (
    <div className="divide-y divide-skin-bdr-lt">
      {tokoList.map((t) => {
        const hasLoc = t.lat != null && t.lng != null;
        return (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <button
              type="button"
              disabled={!hasLoc}
              onClick={() => onToggle(t)}
              className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold disabled:opacity-30 ${
                selected.has(t.id) ? "bg-skin-accent border-skin-accent text-skin-on-accent" : "border-skin-bdr text-transparent"
              }`}
            >
              ✓
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-skin-text truncate">{t.nama}</p>
              <p className="text-xs text-skin-text3 truncate">{t.daerah || t.alamat || "- lokasi belum lengkap -"}</p>
              <SosmedLinks items={parseSosmed(t.media_sosial, t.nama)} className="mt-0.5">
                {buildGmapsPlaceUrl(t) && (
                  <a href={buildGmapsPlaceUrl(t)} target="_blank" rel="noreferrer" className="text-skin-accent-text hover:underline">
                    Google Maps
                  </a>
                )}
              </SosmedLinks>
            </div>
            {!hasLoc && (
              <button
                type="button"
                onClick={() => handleCariTitik(t)}
                disabled={setTokoLocation.isPending}
                className="flex-shrink-0 text-xs font-editorial tracking-[0.05em] uppercase text-skin-accent-text hover:text-skin-accent-text underline disabled:opacity-40"
              >
                Cari Titik
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
