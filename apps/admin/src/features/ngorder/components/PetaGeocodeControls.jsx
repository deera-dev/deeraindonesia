/**
 * PetaGeocodeControls.jsx — SATU tombol "Lengkapi Titik" yang menjalankan
 * berurutan: toko -> pelanggan (dari alamat) -> pelanggan (perkiraan dari
 * nama daerah, hanya yg dikenali whitelist; TIDAK pernah menebak). Satu per
 * satu lewat Google Geocoder + proteksi kuota harian (map-quota). Tombol
 * disembunyikan kalau semua titik sudah lengkap.
 */
import { useMemo, useState } from "react";
import { geocodeAddressMulti } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import { mapQuota } from "@deera/shared/features/map-quota/hooks";
import { tokoNeedingGeocode, buildGeocodeQueries, useSetTokoLocationMutation } from "../hooks";
import {
  usePelangganNeedingGeocodeQuery,
  usePelangganNamaNeedingGeocodeQuery,
  useSetPelangganLocationMutation,
} from "../../pelanggan";
import { buildPelangganGeocodeQueries, isApproxGeocodeMatch, extractDaerahFromNama } from "../../pelanggan/utils";

export default function PetaGeocodeControls({ tokoList }) {
  const setTokoLocation = useSetTokoLocationMutation();
  const setPelangganLocation = useSetPelangganLocationMutation();
  const { data: pelangganNeeding = [] } = usePelangganNeedingGeocodeQuery();
  const { data: pelangganNamaNeeding = [] } = usePelangganNamaNeedingGeocodeQuery();
  const [progress, setProgress] = useState(null); // null | { done, total }

  const tokoNeeding = tokoNeedingGeocode(tokoList);
  const namaCandidates = useMemo(
    () =>
      pelangganNamaNeeding
        .map((p) => ({ p, daerahQuery: extractDaerahFromNama(p.nama) }))
        .filter((x) => x.daerahQuery),
    [pelangganNamaNeeding],
  );
  const total = tokoNeeding.length + pelangganNeeding.length + namaCandidates.length;

  // Return { ok, quota } — quota=true kalau kuota harian habis (hentikan semua).
  async function runBatch(items, doneBefore, grandTotal, { buildQueries, onLocate }) {
    let ok = 0;
    for (let i = 0; i < items.length; i++) {
      try {
        const loc = await geocodeAddressMulti(buildQueries(items[i]));
        if (loc) {
          await onLocate(items[i], loc);
          ok++;
        }
      } catch (err) {
        if (err?.quotaExceeded) {
          toast.error(err.message);
          return { ok, quota: true };
        }
      }
      setProgress({ done: doneBefore + i + 1, total: grandTotal });
    }
    return { ok, quota: false };
  }

  async function handleRun() {
    if (!total || progress) return;
    setProgress({ done: 0, total });
    let ok = 0;
    let done = 0;
    const phases = [
      [tokoNeeding, {
        buildQueries: buildGeocodeQueries,
        onLocate: (t, loc) => setTokoLocation.mutateAsync({ id: t.id, lat: loc.lat, lng: loc.lng, source: "auto" }),
      }],
      [pelangganNeeding, {
        buildQueries: (p) => buildPelangganGeocodeQueries(p.alamat),
        onLocate: (p, loc) =>
          setPelangganLocation.mutateAsync({
            id: p.id,
            lat: loc.lat,
            lng: loc.lng,
            source: isApproxGeocodeMatch(p.alamat, loc.matchedQuery) ? "approx-daerah" : "auto",
          }),
      }],
      [namaCandidates, {
        buildQueries: (x) => [x.daerahQuery],
        onLocate: (x, loc) =>
          setPelangganLocation.mutateAsync({ id: x.p.id, lat: loc.lat, lng: loc.lng, source: "approx-nama" }),
      }],
    ];
    for (const [items, cfg] of phases) {
      if (!items.length) continue;
      const r = await runBatch(items, done, total, cfg);
      ok += r.ok;
      done += items.length;
      if (r.quota) break;
    }
    setProgress(null);
    toast.success(`${ok} titik berhasil ditambahkan.`);
  }

  if (!total && !progress) return null;
  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={!!progress}
      title={`Sisa kuota geocoding hari ini: ${mapQuota.remaining("geocoding")}/${mapQuota.limit("geocoding")}`}
      className="px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] transition disabled:opacity-60"
    >
      {progress ? `Memproses ${progress.done}/${progress.total}...` : `Lengkapi Titik (${total})`}
    </button>
  );
}
