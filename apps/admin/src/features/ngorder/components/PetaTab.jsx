/**
 * PetaTab.jsx — Peta "Ngorder" (permintaan Denny 2026-10, lalu diganti ke
 * Google Maps di permintaan susulan: "iya ganti pake googlemaps aja, saya
 * sudah langganan yang pake free credit per month"): tampilkan toko
 * potensial + pelanggan yang sudah pernah beli di peta, + bantu strategi
 * kunjungan "toko mana dulu yang terdekat & sejalan" lewat Google
 * Directions API (`optimizeWaypoints`) — urutan kunjungan + jarak/durasi
 * sekarang mengikuti JALAN SUNGGUHAN, bukan lagi garis lurus.
 *
 * Kalau Directions API gagal (kuota/network), otomatis jatuh ke estimasi
 * garis lurus (haversine, lihat @deera/shared/lib/geocode.js) supaya
 * fitur tidak mati total.
 *
 * Titik lokasi (lat/lng) TIDAK otomatis — admin generate lewat tombol
 * "Cari Titik" (PetaGeocodeControls/PetaTokoChecklist, Geocoder Google)
 * atau menggeser pin langsung di peta.
 *
 * PENTING soal loading script Google Maps: komponen di bawah SENGAJA
 * TIDAK memakai `useJsApiLoader`/`<LoadScript>` dari @react-google-maps/api
 * — loading dipusatkan lewat `loadGoogleMaps()` di geocode.js (dipanggil
 * di useEffect, lihat `mapsReady`) supaya cuma ada SATU titik load script,
 * lihat komentar panjang di geocode.js kalau mau ubah ini.
 */
import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline, DirectionsRenderer } from "@react-google-maps/api";
import { loadGoogleMaps, computeOptimizedRoute, nearestNeighborRoute } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import { usePelangganPins } from "../../pelanggan";
import { tokoWithLocation, distinctDaerahList, STATUS_APPROACH_LABEL, KESAN_LABEL } from "../hooks";
import { useSetTokoLocationMutation } from "../hooks";
import PetaGeocodeControls from "./PetaGeocodeControls";
import PetaTokoChecklist from "./PetaTokoChecklist";

const INDONESIA_CENTER = { lat: -2.5, lng: 118 };
const MAP_CONTAINER_STYLE = { height: "420px", width: "100%" };

const KESAN_COLOR = { tertarik: "#16a34a", belum_tertarik: "#dc2626" };

function tokoColor(t) {
  if (t.status_approach !== "sudah") return "#9ca3af"; // belum di-approach, abu-abu
  return KESAN_COLOR[t.kesan] ?? "#CAB170"; // sudah approach, kesan belum diisi
}

/** Icon pin bulat berwarna + label huruf/angka (dipakai lintas toko/pelanggan/titik awal). */
function dotIcon(maps, color, scale = 11) {
  return {
    path: maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

/**
 * Icon pin APPROKSIMASI (permintaan Denny 2026-10: pelanggan yang cuma
 * punya nama daerah di alamat, TANPA titik pasti, tetap ditampilkan tapi
 * HARUS dibedain visualnya dari pin pasti) — opacity lebih rendah + outline
 * putus-putus via strokeOpacity rendah, supaya kelihatan "kira-kira" bukan
 * titik sungguhan.
 */
function approxDotIcon(maps, color, scale = 10) {
  return {
    path: maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 0.45,
    strokeColor: "#ffffff",
    strokeOpacity: 0.7,
    strokeWeight: 1.5,
  };
}

function dotLabel(text) {
  return text ? { text, color: "#ffffff", fontSize: "11px", fontWeight: "700" } : undefined;
}

export default function PetaTab({ tokoList }) {
  const { pins: pelangganPins } = usePelangganPins();
  const setTokoLocation = useSetTokoLocationMutation();

  const [maps, setMaps] = useState(null); // google.maps namespace, null sampai script siap
  const [mapsError, setMapsError] = useState(null);
  const [filterDaerah, setFilterDaerah] = useState("");
  const [showPelanggan, setShowPelanggan] = useState(true);
  const [selected, setSelected] = useState(() => new Map()); // id -> toko
  const [pickingStart, setPickingStart] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [locating, setLocating] = useState(false);
  const [computingRoute, setComputingRoute] = useState(false);
  const [route, setRoute] = useState(null); // { order, totalKm, totalMinutes, directionsResult } | null

  useEffect(() => {
    loadGoogleMaps()
      .then((g) => setMaps(g))
      .catch((err) => setMapsError(err.message ?? "Gagal memuat Google Maps"));
  }, []);

  const daerahOptions = useMemo(() => distinctDaerahList(tokoList), [tokoList]);

  const visibleToko = useMemo(() => {
    const withLoc = tokoWithLocation(tokoList);
    if (!filterDaerah) return withLoc;
    return withLoc.filter((t) => (t.daerah ?? "") === filterDaerah);
  }, [tokoList, filterDaerah]);

  const checklistToko = useMemo(() => {
    if (!filterDaerah) return tokoList;
    return tokoList.filter((t) => (t.daerah ?? "") === filterDaerah);
  }, [tokoList, filterDaerah]);

  function toggleSelect(t) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.set(t.id, t);
      return next;
    });
    setRoute(null);
  }

  async function handleHitungRute() {
    const points = [...selected.values()];
    if (points.length === 0) return;
    const start = startPoint ?? points[0];
    const toOrder = startPoint ? points : points.slice(1);
    if (toOrder.length === 0) {
      setRoute({ order: [], totalKm: 0, totalMinutes: 0, directionsResult: null });
      return;
    }
    setComputingRoute(true);
    try {
      const result = await computeOptimizedRoute(start, toOrder);
      setRoute(result);
    } catch (err) {
      toast.error(
        `Gagal menghitung rute Google Maps (${err.message ?? "error"}) — pakai estimasi garis lurus dulu.`,
      );
      const fallback = nearestNeighborRoute(toOrder, start);
      setRoute({ ...fallback, directionsResult: null, isFallback: true });
    } finally {
      setComputingRoute(false);
    }
  }

  async function handleDragEnd(t, e) {
    await setTokoLocation.mutateAsync({ id: t.id, lat: e.latLng.lat(), lng: e.latLng.lng(), source: "manual" });
  }

  /**
   * handleUseMyLocation (permintaan Denny: "set titik awal sesuai dengan
   * lokasi user, jadi minta izin lokasi aja ya") — pakai Geolocation API
   * browser (bawaan browser, lepas dari provider peta yang dipakai) utk
   * langsung set titik awal kunjungan ke posisi GPS tim sales saat ini.
   */
  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Perangkat/browser ini tidak mendukung lokasi GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPickingStart(false);
        setRoute(null);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Izin lokasi ditolak — aktifkan izin lokasi utk situs ini di browser, atau set titik awal manual lewat tombol \"Set Manual di Peta\".",
          );
        } else {
          toast.error("Gagal mengambil lokasi GPS. Coba lagi, atau set titik awal manual lewat peta.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleMapClick(e) {
    if (!pickingStart) return;
    setStartPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    setPickingStart(false);
    setRoute(null);
  }

  // Rute fallback (garis lurus) hanya digambar kalau TIDAK ada hasil
  // Directions asli (directionsResult null — baik krn belum dihitung
  // maupun krn Directions API gagal dan jatuh ke nearestNeighborRoute).
  const straightRouteLine =
    route && !route.directionsResult
      ? [startPoint ?? [...selected.values()][0], ...route.order].map((p) => ({ lat: p.lat, lng: p.lng }))
      : null;

  return (
    <div className="space-y-3">
      <div className="px-4 flex flex-wrap items-center gap-2">
        <select
          value={filterDaerah}
          onChange={(e) => setFilterDaerah(e.target.value)}
          className="bg-skin-card border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
        >
          <option value="">Semua Daerah</option>
          {daerahOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-skin-text3 font-editorial tracking-[0.05em] uppercase">
          <input type="checkbox" checked={showPelanggan} onChange={(e) => setShowPelanggan(e.target.checked)} />
          Tampilkan Pelanggan
        </label>
        {showPelanggan && (
          <span className="flex items-center gap-3 text-[11px] text-skin-text4">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2563eb]" /> titik pasti
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7c3aed] opacity-45" /> perkiraan daerah
            </span>
          </span>
        )}
      </div>

      <div className="px-4">
        <PetaGeocodeControls tokoList={tokoList} />
      </div>

      <div className="px-4">
        <div className="h-[420px] border-2 border-skin-bdr overflow-hidden">
          {mapsError && (
            <div className="h-full flex items-center justify-center text-sm text-red-600 text-center px-4">
              Gagal memuat Google Maps: {mapsError}. Cek VITE_GOOGLE_MAPS_API_KEY di .env.
            </div>
          )}
          {!mapsError && !maps && (
            <div className="h-full flex items-center justify-center text-sm text-skin-text3">Memuat peta...</div>
          )}
          {maps && (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={INDONESIA_CENTER}
              zoom={5}
              onClick={handleMapClick}
            >
              {startPoint && (
                <Marker position={startPoint} icon={dotIcon(maps, "#111827")} label={dotLabel("A")} title="Titik awal kunjungan" />
              )}

              {visibleToko.map((t) => {
                const orderIdx = route?.order.findIndex((p) => p.id === t.id);
                const isOrdered = orderIdx != null && orderIdx >= 0;
                return (
                  <Marker
                    key={t.id}
                    position={{ lat: t.lat, lng: t.lng }}
                    icon={dotIcon(maps, tokoColor(t))}
                    label={dotLabel(isOrdered ? String(orderIdx + 1) : "")}
                    draggable
                    onDragEnd={(e) => handleDragEnd(t, e)}
                    title={`${t.nama}\n${STATUS_APPROACH_LABEL[t.status_approach] ?? t.status_approach}${
                      t.kesan ? ` · ${KESAN_LABEL[t.kesan] ?? t.kesan}` : ""
                    }\n${t.alamat || t.daerah || ""}`}
                  />
                );
              })}

              {showPelanggan &&
                pelangganPins.map((p) => {
                  const isApprox = p.geocode_source === "approx-daerah";
                  return (
                    <Marker
                      key={p.id}
                      position={{ lat: p.lat, lng: p.lng }}
                      icon={isApprox ? approxDotIcon(maps, "#7c3aed") : dotIcon(maps, "#2563eb")}
                      label={dotLabel("P")}
                      title={
                        isApprox
                          ? `${p.nama}\n${p.alamat ?? ""}\n⚠ Lokasi perkiraan — berdasarkan nama daerah, BUKAN titik pasti.`
                          : `${p.nama}\n${p.alamat ?? ""}`
                      }
                    />
                  );
                })}

              {route?.directionsResult && (
                <DirectionsRenderer directions={route.directionsResult} options={{ suppressMarkers: true }} />
              )}
              {straightRouteLine && (
                <Polyline path={straightRouteLine} options={{ strokeColor: "#CAB170", strokeWeight: 3 }} />
              )}
            </GoogleMap>
          )}
        </div>
      </div>

      <div className="px-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] transition disabled:opacity-40"
        >
          {locating ? "Mencari Lokasi..." : "Gunakan Lokasi Saya"}
        </button>
        <button
          type="button"
          onClick={() => setPickingStart((v) => !v)}
          className={`px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border transition ${
            pickingStart ? "bg-[#111827] text-white border-[#111827]" : "border-skin-bdr text-skin-text2 hover:border-[#CAB170]"
          }`}
        >
          {pickingStart ? "Klik Peta utk Titik Awal..." : "Set Manual di Peta"}
        </button>
        <button
          type="button"
          onClick={handleHitungRute}
          disabled={selected.size === 0 || computingRoute}
          className="px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
        >
          {computingRoute ? "Menghitung Rute..." : `Urutkan Kunjungan Terdekat (${selected.size} toko)`}
        </button>
        {route && (
          <span className="text-xs text-skin-text3">
            {route.directionsResult
              ? `Rute jalan ≈ ${route.totalKm.toFixed(1)} km · ${Math.round(route.totalMinutes)} menit (Google Maps)`
              : `Estimasi jarak garis lurus total ≈ ${route.totalKm.toFixed(1)} km (fallback, bukan rute jalan sebenarnya)`}
          </span>
        )}
      </div>

      <div className="px-4">
        <p className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
          Pilih Toko utk Rencana Kunjungan
        </p>
        <div className="border border-skin-bdr-lt bg-skin-card">
          <PetaTokoChecklist tokoList={checklistToko} selected={selected} onToggle={toggleSelect} />
        </div>
      </div>
    </div>
  );
}
