/**
 * PetaGeocodeControls.jsx — tombol geocoding massal (toko & pelanggan)
 * utk PetaTab, sekarang lewat Google Geocoder (lihat
 * @deera/shared/lib/geocode.js) — dijalankan SATU PER SATU (bukan paralel)
 * supaya progress bar bisa akurat & tidak membanjiri browser dgn request
 * sekaligus, TAPI tanpa delay artifisial lagi (Google tidak punya hard
 * rate-limit seketat Nominatim/OSM yang dipakai sebelumnya).
 */
import { useState } from "react";
import { geocodeAddressMulti } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import { mapQuota } from "@deera/shared/features/map-quota/hooks";
import {
  tokoNeedingGeocode,
  buildGeocodeQueries,
  useSetTokoLocationMutation,
} from "../hooks";
import { usePelangganNeedingGeocodeQuery, useSetPelangganLocationMutation } from "../../pelanggan";
import { buildPelangganGeocodeQueries, isApproxGeocodeMatch } from "../../pelanggan/utils";

export default function PetaGeocodeControls({ tokoList }) {
  const setTokoLocation = useSetTokoLocationMutation();
  const setPelangganLocation = useSetPelangganLocationMutation();
  const { data: pelangganNeeding = [] } = usePelangganNeedingGeocodeQuery();

  const [running, setRunning] = useState(null); // null | "toko" | "pelanggan"
  const [progress, setProgress] = useState({ done: 0, total: 0, gagal: 0 });

  const tokoNeeding = tokoNeedingGeocode(tokoList);

  async function runBatch(items, { buildQueries, onLocate }) {
    setProgress({ done: 0, total: items.length, gagal: 0 });
    let gagal = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Coba beberapa variasi query per item (alamat lengkap -> alamat
        // disederhanakan -> daerah saja -> nama) — lihat buildGeocodeQueries
        // di ngorder/utils.js. Google Geocoder jauh lebih lengkap drpd
        // Nominatim utk alamat Indonesia, tapi fallback ini dipertahankan
        // utk alamat yang ditulis tidak standar.
        const loc = await geocodeAddressMulti(buildQueries(item));
        if (loc) {
          await onLocate(item, loc);
        } else {
          gagal++;
        }
      } catch (err) {
        // Kuota harian geocoding (lihat @deera/shared/features/map-quota)
        // habis — item SISANYA pasti ditolak jg, jadi langsung berhenti drpd
        // nge-loop percuma & nampilin "gagal" yg menyesatkan (serasa alamat
        // yg salah, padahal cuma kuota habis).
        if (err?.quotaExceeded) {
          setProgress({ done: i, total: items.length, gagal });
          toast.error(err.message);
          return;
        }
        gagal++;
      }
      setProgress({ done: i + 1, total: items.length, gagal });
    }
  }

  async function handleGeocodeToko() {
    if (!tokoNeeding.length || running) return;
    setRunning("toko");
    await runBatch(tokoNeeding, {
      buildQueries: buildGeocodeQueries,
      onLocate: (t, loc) => setTokoLocation.mutateAsync({ id: t.id, ...loc, source: "auto" }),
    });
    setRunning(null);
    if (mapQuota.remaining("geocoding") > 0) toast.success("Geocoding toko selesai.");
  }

  async function handleGeocodePelanggan() {
    if (!pelangganNeeding.length || running) return;
    setRunning("pelanggan");
    await runBatch(pelangganNeeding, {
      // Coba alamat lengkap dulu (titik PASTI); kalau gagal, fallback ke
      // nama daerah saja dari ekor alamat (titik APPROKSIMASI — ditandai
      // geocode_source "approx-daerah" biar PetaTab bisa gambar beda, lihat
      // features/pelanggan/utils.js buildPelangganGeocodeQueries).
      buildQueries: (p) => buildPelangganGeocodeQueries(p.alamat),
      onLocate: (p, loc) => {
        const isApprox = isApproxGeocodeMatch(p.alamat, loc.matchedQuery);
        return setPelangganLocation.mutateAsync({
          id: p.id,
          lat: loc.lat,
          lng: loc.lng,
          source: isApprox ? "approx-daerah" : "auto",
        });
      },
    });
    setRunning(null);
    if (mapQuota.remaining("geocoding") > 0) toast.success("Geocoding pelanggan selesai.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={handleGeocodeToko}
        disabled={!tokoNeeding.length || !!running}
        className="px-3 py-2 font-editorial tracking-[0.05em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] transition disabled:opacity-40"
      >
        Cari Titik Toko ({tokoNeeding.length} belum)
      </button>
      <button
        type="button"
        onClick={handleGeocodePelanggan}
        disabled={!pelangganNeeding.length || !!running}
        className="px-3 py-2 font-editorial tracking-[0.05em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] transition disabled:opacity-40"
      >
        Cari Titik Pelanggan ({pelangganNeeding.length} belum)
      </button>
      {running && (
        <span className="text-skin-text3">
          Memproses {progress.done}/{progress.total}
          {progress.gagal > 0 ? ` (${progress.gagal} gagal/tidak ketemu)` : ""}...
        </span>
      )}
      <span className="w-full text-[11px] text-skin-text4 basis-full">
        Kalau tetap gagal walau alamat sudah diisi: alamat itu kemungkinan ditulis tidak standar
        (typo, singkatan tidak umum, dst). Coba sederhanakan alamat (nama jalan + kota saja) lalu
        geocode ulang, atau geser pin langsung di peta secara manual.
      </span>
      <span className="w-full text-[11px] text-skin-text4 basis-full">
        Sisa kuota geocoding hari ini: {mapQuota.remaining("geocoding")}/{mapQuota.limit("geocoding")} — proteksi
        sisi aplikasi supaya tidak sampai kena biaya di luar free tier Google Maps.
      </span>
    </div>
  );
}
