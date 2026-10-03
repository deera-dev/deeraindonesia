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
 *
 * Pin custom (permintaan Denny 2026-10: "ganti semua pinnya ya... pakai
 * pin-deera-*") — semua file ada di apps/admin/public/pin-*.png (teardrop
 * 600x800, kepala di atas). SATU-SATUNYA tempat yang tahu nama file =
 * tokoPinUrl()/PELANGGAN_PIN di bawah.
 *
 * Marker sekarang BISA DIKLIK (permintaan Denny: "pinnya juga gabisa di
 * klik ya? ga ada fitur dari google maps api yg bisa kita manfaatkan?") —
 * pakai <InfoWindow> (komponen asli @react-google-maps/api) utk nampilin
 * detail + aksi cepat (pilih utk rute, buka WA) begitu pin diklik, tanpa
 * ganggu drag-to-reposition yang sudah ada.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, DirectionsRenderer, Autocomplete, InfoWindow } from "@react-google-maps/api";
import { loadGoogleMaps, computeOptimizedRoute, nearestNeighborRoute } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import { buildWaLink } from "../../blast/utils";
import { usePelangganPins } from "../../pelanggan";
import { tokoWithLocation, distinctDaerahList, STATUS_APPROACH_LABEL, KESAN_LABEL } from "../hooks";
import { useSetTokoLocationMutation } from "../hooks";
import PetaGeocodeControls from "./PetaGeocodeControls";
import PetaTokoChecklist from "./PetaTokoChecklist";

const INDONESIA_CENTER = { lat: -2.5, lng: 118 };
const MAP_CONTAINER_STYLE = { height: "420px", width: "100%" };

// Pin teardrop 600x800 (kepala pin di ~0-55% atas, ekor nancep di bawah) —
// scaledSize/anchor dibikin konsisten semua pin pakai rasio yang sama.
const PIN_SIZE = { width: 28, height: 37 };

function pinIcon(maps, url) {
  return {
    url,
    scaledSize: new maps.Size(PIN_SIZE.width, PIN_SIZE.height),
    anchor: new maps.Point(PIN_SIZE.width / 2, PIN_SIZE.height),
  };
}

const TOKO_PIN_BELUM_APPROACH = "/pin-deera-kuning.png";
const TOKO_PIN_TERTARIK = "/pin-deera-hijau.png";
const TOKO_PIN_BELUM_TERTARIK = "/pin-deera-merah.png";
const TOKO_PIN_KESAN_KOSONG = "/pin-deera-putih.png";
const PELANGGAN_PIN_PASTI = "/pin-deera-biru.png";
const PELANGGAN_PIN_APPROX = "/pin-deera-hitam.png";
const USER_PIN = "/pin-lokasi-saat-ini.png";

function tokoPinUrl(t) {
  if (t.status_approach !== "sudah") return TOKO_PIN_BELUM_APPROACH;
  if (t.kesan === "tertarik") return TOKO_PIN_TERTARIK;
  if (t.kesan === "belum_tertarik") return TOKO_PIN_BELUM_TERTARIK;
  return TOKO_PIN_KESAN_KOSONG;
}

function orderLabel(text) {
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
  const [pickingUserPoint, setPickingUserPoint] = useState(false);
  const [userPoint, setUserPoint] = useState(null); // "titik Anda" — BISA berubah-ubah tiap hari, bukan titik baku
  const [locating, setLocating] = useState(false);
  const searchAutocompleteRef = useRef(null);
  const [computingRoute, setComputingRoute] = useState(false);
  const [route, setRoute] = useState(null); // { order, totalKm, totalMinutes, directionsResult } | null
  const [activeMarker, setActiveMarker] = useState(null); // { kind: "user"|"toko"|"pelanggan", data } | null

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
    const start = userPoint ?? points[0];
    const toOrder = userPoint ? points : points.slice(1);
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
   * langsung set "titik Anda" ke posisi GPS tim sales saat ini. Dinamakan
   * "titik Anda" (bukan "titik awal") krn titiknya BISA beda-beda tiap
   * kunjungan, bukan sesuatu yang baku.
   */
  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Perangkat/browser ini tidak mendukung lokasi GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPickingUserPoint(false);
        setRoute(null);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Izin lokasi ditolak — aktifkan izin lokasi utk situs ini di browser, atau set titik Anda manual lewat tombol \"Set Manual di Peta\" / cari alamat.",
          );
        } else {
          toast.error("Gagal mengambil lokasi GPS. Coba lagi, atau set titik Anda manual lewat peta/cari alamat.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleMapClick(e) {
    setActiveMarker(null);
    if (!pickingUserPoint) return;
    setUserPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    setPickingUserPoint(false);
    setRoute(null);
  }

  /**
   * handleSearchPlaceChanged (permintaan Denny 2026-10: "saya mau bisa
   * search disana, dan bisa langsung set titiknya") — dipasangkan ke
   * <Autocomplete onPlaceChanged>, dipanggil begitu user pilih salah satu
   * saran alamat. `place.geometry` bisa undefined kalau user ngetik bebas
   * lalu Enter TANPA pilih saran (lihat AutocompleteProps.onPlaceChanged
   * di @react-google-maps/api) — jangan crash, kasih toast aja.
   */
  function handleSearchPlaceChanged() {
    const place = searchAutocompleteRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) {
      toast.error("Alamat tidak ketemu — pilih salah satu saran yang muncul, jangan cuma ketik lalu Enter.");
      return;
    }
    setUserPoint({ lat: loc.lat(), lng: loc.lng() });
    setPickingUserPoint(false);
    setRoute(null);
  }

  // Rute fallback (garis lurus) hanya digambar kalau TIDAK ada hasil
  // Directions asli (directionsResult null — baik krn belum dihitung
  // maupun krn Directions API gagal dan jatuh ke nearestNeighborRoute).
  const straightRouteLine =
    route && !route.directionsResult
      ? [userPoint ?? [...selected.values()][0], ...route.order].map((p) => ({ lat: p.lat, lng: p.lng }))
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
      </div>

      {/* Cari alamat utk set "titik Anda" langsung (permintaan Denny
          2026-10: "saya juga mau bisa search disana, dan bisa langsung
          set titiknya") — butuh library "places" Google Maps, lihat
          loadGoogleMaps() di @deera/shared/lib/geocode.js. */}
      {maps && (
        <div className="px-4">
          <Autocomplete
            onLoad={(ac) => (searchAutocompleteRef.current = ac)}
            onPlaceChanged={handleSearchPlaceChanged}
            options={{ componentRestrictions: { country: "id" } }}
          >
            <input
              type="text"
              placeholder="Cari alamat utk set titik Anda..."
              className="w-full bg-skin-card border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
            />
          </Autocomplete>
        </div>
      )}

      <div className="px-4">
        <PetaGeocodeControls tokoList={tokoList} />
      </div>

      {/* Legend pin (permintaan Denny: "pinnya bikin bingung... harus lebih
          informatif") — SELALU tampil, pakai thumbnail pin ASLI (bukan dot
          warna lagi) biar sama persis dgn yang muncul di peta. Klik pin di
          peta utk lihat detail + aksi (InfoWindow). */}
      <div className="px-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-skin-text3">
        <span className="flex items-center gap-1.5">
          <img src={USER_PIN} alt="" className="w-4 h-5 object-contain" />
          Titik Anda (bisa berubah-ubah, bukan titik baku)
        </span>
        <span className="flex items-center gap-1.5">
          <img src={TOKO_PIN_BELUM_APPROACH} alt="" className="w-4 h-5 object-contain" />
          Toko belum di-approach
        </span>
        <span className="flex items-center gap-1.5">
          <img src={TOKO_PIN_TERTARIK} alt="" className="w-4 h-5 object-contain" />
          Toko tertarik
        </span>
        <span className="flex items-center gap-1.5">
          <img src={TOKO_PIN_BELUM_TERTARIK} alt="" className="w-4 h-5 object-contain" />
          Toko belum tertarik
        </span>
        <span className="flex items-center gap-1.5">
          <img src={TOKO_PIN_KESAN_KOSONG} alt="" className="w-4 h-5 object-contain" />
          Sudah approach, kesan belum diisi
        </span>
        {showPelanggan && (
          <>
            <span className="flex items-center gap-1.5">
              <img src={PELANGGAN_PIN_PASTI} alt="" className="w-4 h-5 object-contain" />
              Pelanggan — titik pasti
            </span>
            <span className="flex items-center gap-1.5">
              <img src={PELANGGAN_PIN_APPROX} alt="" className="w-4 h-5 object-contain" />
              Pelanggan — perkiraan (dari alamat/nama daerah)
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#CAB170] text-white text-[9px] font-bold">1</span>
          Urutan kunjungan (setelah dihitung)
        </span>
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
              {userPoint && (
                <Marker
                  position={userPoint}
                  icon={pinIcon(maps, USER_PIN)}
                  title="Titik Anda (bisa berubah-ubah)"
                  onClick={() => setActiveMarker({ kind: "user", data: userPoint })}
                />
              )}

              {visibleToko.map((t) => {
                const orderIdx = route?.order.findIndex((p) => p.id === t.id);
                const isOrdered = orderIdx != null && orderIdx >= 0;
                return (
                  <Marker
                    key={t.id}
                    position={{ lat: t.lat, lng: t.lng }}
                    icon={pinIcon(maps, tokoPinUrl(t))}
                    label={orderLabel(isOrdered ? String(orderIdx + 1) : "")}
                    draggable
                    onDragEnd={(e) => handleDragEnd(t, e)}
                    onClick={() => setActiveMarker({ kind: "toko", data: t })}
                    title={`${t.nama}\n${STATUS_APPROACH_LABEL[t.status_approach] ?? t.status_approach}${
                      t.kesan ? ` · ${KESAN_LABEL[t.kesan] ?? t.kesan}` : ""
                    }\n${t.alamat || t.daerah || ""}`}
                  />
                );
              })}

              {showPelanggan &&
                pelangganPins.map((p) => {
                  const isApprox = p.geocode_source === "approx-daerah" || p.geocode_source === "approx-nama";
                  return (
                    <Marker
                      key={p.id}
                      position={{ lat: p.lat, lng: p.lng }}
                      icon={pinIcon(maps, isApprox ? PELANGGAN_PIN_APPROX : PELANGGAN_PIN_PASTI)}
                      onClick={() => setActiveMarker({ kind: "pelanggan", data: p })}
                      title={`${p.nama}\n${p.alamat ?? ""}`}
                    />
                  );
                })}

              {/* InfoWindow (permintaan Denny: "ga ada fitur dari google
                  maps api yg bisa kita manfaatkan?") — detail + aksi cepat
                  begitu pin diklik, memanfaatkan komponen asli
                  @react-google-maps/api, bukan cuma tooltip `title` pasif. */}
              {activeMarker?.kind === "user" && (
                <InfoWindow position={activeMarker.data} onCloseClick={() => setActiveMarker(null)}>
                  <div className="text-xs text-gray-800 max-w-[200px]">
                    <p className="font-semibold mb-1">Titik Anda</p>
                    <p className="text-gray-600">Bisa berubah-ubah — set ulang lewat GPS, klik peta, atau cari alamat.</p>
                  </div>
                </InfoWindow>
              )}

              {activeMarker?.kind === "toko" && (
                <InfoWindow
                  position={{ lat: activeMarker.data.lat, lng: activeMarker.data.lng }}
                  onCloseClick={() => setActiveMarker(null)}
                >
                  <div className="text-xs text-gray-800 max-w-[220px] space-y-1">
                    <p className="font-semibold">{activeMarker.data.nama}</p>
                    <p className="text-gray-600">
                      {STATUS_APPROACH_LABEL[activeMarker.data.status_approach] ?? activeMarker.data.status_approach}
                      {activeMarker.data.kesan ? ` · ${KESAN_LABEL[activeMarker.data.kesan] ?? activeMarker.data.kesan}` : ""}
                    </p>
                    {(activeMarker.data.alamat || activeMarker.data.daerah) && (
                      <p className="text-gray-500">{activeMarker.data.alamat || activeMarker.data.daerah}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSelect(activeMarker.data)}
                        className="text-[11px] font-semibold uppercase text-[#A8925A] underline"
                      >
                        {selected.has(activeMarker.data.id) ? "Batalkan dari Rute" : "Pilih utk Rute"}
                      </button>
                      {activeMarker.data.no_hp && (
                        <a
                          href={buildWaLink(activeMarker.data.no_hp, `Halo ${activeMarker.data.nama}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold uppercase text-green-700 underline"
                        >
                          WA
                        </a>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              )}

              {activeMarker?.kind === "pelanggan" && (
                <InfoWindow
                  position={{ lat: activeMarker.data.lat, lng: activeMarker.data.lng }}
                  onCloseClick={() => setActiveMarker(null)}
                >
                  <div className="text-xs text-gray-800 max-w-[220px] space-y-1">
                    <p className="font-semibold">{activeMarker.data.nama}</p>
                    {activeMarker.data.alamat && <p className="text-gray-500">{activeMarker.data.alamat}</p>}
                    {(activeMarker.data.geocode_source === "approx-daerah" ||
                      activeMarker.data.geocode_source === "approx-nama") && (
                      <p className="text-amber-600">⚠ Lokasi perkiraan, bukan titik pasti.</p>
                    )}
                    {activeMarker.data.no_hp && (
                      <a
                        href={buildWaLink(activeMarker.data.no_hp, `Halo ${activeMarker.data.nama}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold uppercase text-green-700 underline"
                      >
                        WA
                      </a>
                    )}
                  </div>
                </InfoWindow>
              )}

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
          onClick={() => setPickingUserPoint((v) => !v)}
          className={`px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border transition ${
            pickingUserPoint ? "bg-[#111827] text-white border-[#111827]" : "border-skin-bdr text-skin-text2 hover:border-[#CAB170]"
          }`}
        >
          {pickingUserPoint ? "Klik Peta utk Set Titik Anda..." : "Set Manual di Peta"}
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
