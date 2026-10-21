import { geocodeAddressMulti } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import {
  buildGeocodeQueries,
  useSetTokoLocationMutation,
  parseSosmed,
  buildGmapsPlaceUrl,
  STATUS_APPROACH_LABEL,
  KESAN_LABEL,
} from "../hooks";
import SosmedLinks from "../../../shared/components/SosmedLinks";

const KESAN_BADGE = {
  tertarik: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  belum_tertarik: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

export default function PetaTokoChecklist({ tokoList, selected, onToggle, onOpen, onEdit, onPlacePin }) {
  const setTokoLocation = useSetTokoLocationMutation();

  async function handleCariTitik(t) {
    try {
      const loc = await geocodeAddressMulti(buildGeocodeQueries(t));
      if (!loc) {
        toast.error(`Lokasi "${t.nama}" tidak ketemu — sederhanakan alamat, atau pakai "Taruh pin" lalu ketuk peta.`);
        return;
      }
      await setTokoLocation.mutateAsync({ id: t.id, ...loc, source: "auto" });
      toast.success(`${t.nama} sudah ada di peta.`);
    } catch (err) {
      toast.error(err.message ?? "Gagal mencari titik lokasi.");
    }
  }

  if (tokoList.length === 0) {
    return <p className="text-sm text-skin-text4 py-6 text-center px-4">Tidak ada toko yang cocok.</p>;
  }

  return (
    <div className="divide-y divide-skin-bdr-lt">
      {tokoList.map((t) => {
        const hasLoc = t.lat != null && t.lng != null;
        const isSelected = selected.has(t.id);
        const gmaps = buildGmapsPlaceUrl(t);
        return (
          <div key={t.id} className="flex items-start gap-3 px-4 py-2.5">
            <button
              type="button"
              aria-label={isSelected ? `Keluarkan ${t.nama} dari rencana` : `Masukkan ${t.nama} ke rencana`}
              aria-pressed={isSelected}
              onClick={() => onToggle(t)}
              className={`mt-0.5 flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                isSelected ? "bg-skin-accent border-skin-accent text-skin-on-accent" : "border-skin-bdr text-transparent"
              }`}
            >
              ✓
            </button>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onOpen?.(t)} className="block w-full text-left">
                <p className="text-sm font-semibold text-skin-text truncate">{t.nama}</p>
                <p className="text-xs text-skin-text3 truncate">
                  {t.daerah ? `${t.daerah} · ` : ""}
                  {t.alamat || "- alamat belum diisi -"}
                </p>
              </button>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 border border-skin-bdr-lt text-skin-text3">
                  {STATUS_APPROACH_LABEL[t.status_approach] ?? t.status_approach}
                </span>
                {t.kesan && (
                  <span className={`text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 rounded ${KESAN_BADGE[t.kesan] ?? ""}`}>
                    {KESAN_LABEL[t.kesan] ?? t.kesan}
                  </span>
                )}
                {!hasLoc && (
                  <span className="text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    Belum ada titik
                  </span>
                )}
              </div>
              <SosmedLinks items={parseSosmed(t.media_sosial, t.nama)} className="mt-1">
                {gmaps && (
                  <a href={gmaps} target="_blank" rel="noreferrer" className="text-skin-accent-text hover:underline">
                    Google Maps
                  </a>
                )}
              </SosmedLinks>
              {(!hasLoc || onEdit) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-semibold uppercase">
                  {!hasLoc && (
                    <button
                      type="button"
                      onClick={() => handleCariTitik(t)}
                      disabled={setTokoLocation.isPending}
                      className="text-skin-accent-text underline disabled:opacity-40"
                    >
                      Cari titik
                    </button>
                  )}
                  {!hasLoc && onPlacePin && (
                    <button type="button" onClick={() => onPlacePin(t)} className="text-sky-600 underline">
                      Taruh pin
                    </button>
                  )}
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(t)} className="text-skin-text3 hover:text-skin-text underline">
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
