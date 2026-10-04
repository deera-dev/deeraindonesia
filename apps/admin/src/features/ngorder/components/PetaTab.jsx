/**
 * PetaTab.jsx — Peta "Ngorder": toko potensial (+ pelanggan, default
 * disembunyikan) di Google Maps, kunjungan diurutkan via Directions API
 * (fallback garis lurus kalau gagal). Load script Google Maps HANYA lewat
 * loadGoogleMaps() di @deera/shared/lib/geocode (jangan pakai useJsApiLoader).
 *
 * "Titik Anda" = posisi user saat ini (BUKAN titik baku): diset lewat kotak
 * cari / ikon GPS, dan pinnya bisa digeser. Pin custom: public/pin-*.png.
 * Klik pin = InfoWindow (detail + aksi cepat).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, DirectionsRenderer, InfoWindow } from "@react-google-maps/api";
import { loadGoogleMaps, computeOptimizedRoute, nearestNeighborRoute, rankNearestByRoad } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";
import { buildWaLink } from "../../blast/utils";
import { usePelangganPins } from "../../pelanggan";
import {
  tokoWithLocation,
  distinctDaerahList,
  STATUS_APPROACH_LABEL,
  KESAN_LABEL,
  buildGmapsDirUrl,
  clusterPoints,
  useSetTokoLocationMutation,
} from "../hooks";
import PetaGeocodeControls from "./PetaGeocodeControls";
import PetaSearchBox from "./PetaSearchBox";
import PetaCariToko from "./PetaCariToko";
import PetaTerdekat from "./PetaTerdekat";
import PetaTokoChecklist from "./PetaTokoChecklist";

const INDONESIA_CENTER = { lat: -2.5, lng: 118 };
const MAP_CONTAINER_STYLE = { height: "100%", width: "100%" };
const PIN_SIZE = { width: 28, height: 37 }; // teardrop 600x800, ujung di bawah-tengah

function pinIcon(maps, url) {
  return {
    url,
    scaledSize: new maps.Size(PIN_SIZE.width, PIN_SIZE.height),
    anchor: new maps.Point(PIN_SIZE.width / 2, PIN_SIZE.height),
  };
}

const PIN = {
  belum: "/pin-deera-kuning.png",
  tertarik: "/pin-deera-hijau.png",
  belumTertarik: "/pin-deera-merah.png",
  kosong: "/pin-deera-putih.png",
  pelPasti: "/pin-deera-biru.png",
  pelApprox: "/pin-deera-hitam.png",
  user: "/pin-lokasi-saat-ini.png",
};

function tokoPinUrl(t) {
  if (t.status_approach !== "sudah") return PIN.belum;
  if (t.kesan === "tertarik") return PIN.tertarik;
  if (t.kesan === "belum_tertarik") return PIN.belumTertarik;
  return PIN.kosong;
}

const CLUSTER_MAX_ZOOM = 13; // di atas zoom ini semua pin tampil satuan

function clusterIcon(maps, items) {
  const color = items.some((i) => i.kind === "toko") ? "#CAB170" : "#2563EB";
  const size = items.length < 10 ? 34 : items.length < 100 ? 40 : 46;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size / 2),
  };
}

const isApproxPin = (p) => p.geocode_source === "approx-daerah" || p.geocode_source === "approx-nama";
const orderLabel = (text) => (text ? { text, color: "#ffffff", fontSize: "11px", fontWeight: "700" } : undefined);

function LegendItem({ src, label }) {
  return (
    <span className="flex items-center gap-1">
      <img src={src} alt="" className="w-3.5 h-[18px] object-contain" />
      {label}
    </span>
  );
}

export default function PetaTab({ tokoList }) {
  const { pins: pelangganPins } = usePelangganPins();
  const setTokoLocation = useSetTokoLocationMutation();

  const [maps, setMaps] = useState(null);
  const [mapsError, setMapsError] = useState(null);
  const [filterDaerah, setFilterDaerah] = useState("");
  const [showPelanggan, setShowPelanggan] = useState(false);
  const [selected, setSelected] = useState(() => new Map());
  const [userPoint, setUserPoint] = useState(null);
  const [locating, setLocating] = useState(false);
  const [computingRoute, setComputingRoute] = useState(false);
  const [route, setRoute] = useState(null); // { order, totalKm, totalMinutes, directionsResult, isFallback? }
  const [activeMarker, setActiveMarker] = useState(null); // { kind: "toko"|"pelanggan", data }
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(5);
  const [showCari, setShowCari] = useState(false);
  const [nearest, setNearest] = useState([]);
  const [rankingNearest, setRankingNearest] = useState(false);

  useEffect(() => {
    loadGoogleMaps()
      .then((g) => setMaps(g))
      .catch((err) => setMapsError(err.message ?? "Gagal memuat Google Maps"));
  }, []);

  const daerahOptions = useMemo(() => distinctDaerahList(tokoList), [tokoList]);
  const visibleToko = useMemo(() => {
    const withLoc = tokoWithLocation(tokoList);
    return filterDaerah ? withLoc.filter((t) => (t.daerah ?? "") === filterDaerah) : withLoc;
  }, [tokoList, filterDaerah]);
  const checklistToko = useMemo(
    () => (filterDaerah ? tokoList.filter((t) => (t.daerah ?? "") === filterDaerah) : tokoList),
    [tokoList, filterDaerah],
  );

  function toggleSelect(t) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.set(t.id, t);
      return next;
    });
    setRoute(null);
  }

  // Set "titik Anda" + geser/zoom peta ke sana supaya hasilnya langsung kelihatan.
  function applyUserPoint(loc) {
    setUserPoint(loc);
    setRoute(null);
    setNearest([]);
    const m = mapRef.current;
    if (m) {
      m.panTo(loc);
      if ((m.getZoom() ?? 0) < 12) m.setZoom(13);
    }
  }

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Browser ini tidak mendukung GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyUserPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak - aktifkan di browser, atau cari alamat."
            : "Gagal mengambil lokasi GPS.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleTerdekat() {
    if (!userPoint) return;
    setRankingNearest(true);
    try {
      setNearest(await rankNearestByRoad(userPoint, visibleToko));
    } catch (err) {
      toast.error(err.message ?? "Gagal menghitung toko terdekat.");
    } finally {
      setRankingNearest(false);
    }
  }

  function selectAllNearest() {
    setSelected((prev) => {
      const next = new Map(prev);
      nearest.forEach((t) => next.set(t.id, t));
      return next;
    });
    setRoute(null);
  }

  function handleClusterClick(g) {
    const m = mapRef.current;
    if (!m || !maps) return;
    const b = new maps.LatLngBounds();
    g.items.forEach((i) => b.extend({ lat: i.lat, lng: i.lng }));
    m.fitBounds(b, 60);
  }

  async function handleHitungRute() {
    const points = [...selected.values()];
    if (!points.length) return;
    const start = userPoint ?? points[0];
    const toOrder = userPoint ? points : points.slice(1);
    if (!toOrder.length) {
      setRoute({ order: [], totalKm: 0, totalMinutes: 0, directionsResult: null });
      return;
    }
    setComputingRoute(true);
    try {
      setRoute(await computeOptimizedRoute(start, toOrder));
    } catch (err) {
      toast.error(`Rute Google Maps gagal (${err.message ?? "error"}) - pakai estimasi garis lurus.`);
      setRoute({ ...nearestNeighborRoute(toOrder, start), directionsResult: null, isFallback: true });
    } finally {
      setComputingRoute(false);
    }
  }

  // Pin dikelompokkan (cluster) saat zoom jauh; toko yg dipilih utk rute selalu tampil satuan.
  const clusters = useMemo(() => {
    const toko = visibleToko.map((t) => ({ kind: "toko", id: t.id, lat: t.lat, lng: t.lng, data: t }));
    const pel = showPelanggan
      ? pelangganPins.map((p) => ({ kind: "pelanggan", id: p.id, lat: p.lat, lng: p.lng, data: p }))
      : [];
    const forced = toko.filter((p) => selected.has(p.id));
    const rest = [...toko.filter((p) => !selected.has(p.id)), ...pel];
    const single = (p) => ({ lat: p.lat, lng: p.lng, items: [p] });
    const groups = zoom > CLUSTER_MAX_ZOOM ? rest.map(single) : clusterPoints(rest, zoom);
    return [...forced.map(single), ...groups];
  }, [visibleToko, pelangganPins, showPelanggan, selected, zoom]);

  const straightRouteLine =
    route && !route.directionsResult
      ? [userPoint ?? [...selected.values()][0], ...route.order].map((p) => ({ lat: p.lat, lng: p.lng }))
      : null;
  const gmapsUrl = route?.order?.length ? buildGmapsDirUrl(userPoint, route.order) : null;

  return (
    <div className="space-y-3">
      <div className="px-4">
        <PetaSearchBox onPick={applyUserPoint} onLocate={handleUseMyLocation} locating={locating} />
      </div>

      <div className="px-4 flex flex-wrap items-center gap-2">
        <select
          value={filterDaerah}
          onChange={(e) => setFilterDaerah(e.target.value)}
          className="bg-skin-card border border-skin-bdr px-3 py-2 text-xs text-skin-text focus:outline-none focus:border-[#CAB170] transition"
        >
          <option value="">Semua Daerah</option>
          {daerahOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={showPelanggan}
          onClick={() => setShowPelanggan((v) => !v)}
          className={`px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border transition ${
            showPelanggan ? "border-[#CAB170] text-[#CAB170]" : "border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
          }`}
        >
          Pelanggan
        </button>
        <PetaGeocodeControls tokoList={tokoList} />
        {userPoint && (
          <button
            type="button"
            onClick={handleTerdekat}
            disabled={rankingNearest}
            className="px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] transition disabled:opacity-40"
          >
            {rankingNearest ? "Menghitung..." : "Terdekat"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCari(true)}
          className="px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase border border-[#CAB170] text-[#CAB170] hover:bg-[#CAB170] hover:text-white transition ml-auto"
        >
          + Cari Toko
        </button>
      </div>

      <div className="px-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-skin-text3">
        <LegendItem src={PIN.user} label="Anda" />
        <LegendItem src={PIN.belum} label="Belum didatangi" />
        <LegendItem src={PIN.tertarik} label="Tertarik" />
        <LegendItem src={PIN.belumTertarik} label="Belum tertarik" />
        <LegendItem src={PIN.kosong} label="Belum ada kesan" />
        {showPelanggan && (
          <>
            <LegendItem src={PIN.pelPasti} label="Pelanggan" />
            <LegendItem src={PIN.pelApprox} label="Pelanggan (perkiraan)" />
          </>
        )}
      </div>

      <div className="px-4">
        <div className="h-[420px] border-2 border-skin-bdr overflow-hidden">
          {mapsError && (
            <div className="h-full flex items-center justify-center text-sm text-red-600 text-center px-4">
              Gagal memuat Google Maps: {mapsError}
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
              onLoad={(m) => (mapRef.current = m)}
              onZoomChanged={() => mapRef.current && setZoom(mapRef.current.getZoom() ?? 5)}
              onClick={() => setActiveMarker(null)}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              {userPoint && (
                <Marker
                  position={userPoint}
                  icon={pinIcon(maps, PIN.user)}
                  title="Titik Anda (geser untuk pindah)"
                  draggable
                  onDragEnd={(e) => applyUserPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                />
              )}

              {clusters.map((g) => {
                if (g.items.length > 1) {
                  return (
                    <Marker
                      key={`c-${g.items[0].kind}-${g.items[0].id}-${g.items.length}`}
                      position={{ lat: g.lat, lng: g.lng }}
                      icon={clusterIcon(maps, g.items)}
                      label={{ text: String(g.items.length), color: "#ffffff", fontSize: "12px", fontWeight: "700" }}
                      onClick={() => handleClusterClick(g)}
                    />
                  );
                }
                const it = g.items[0];
                if (it.kind === "toko") {
                  const t = it.data;
                  const idx = route?.order.findIndex((p) => p.id === t.id);
                  return (
                    <Marker
                      key={`t-${t.id}`}
                      position={{ lat: t.lat, lng: t.lng }}
                      icon={pinIcon(maps, tokoPinUrl(t))}
                      label={orderLabel(idx != null && idx >= 0 ? String(idx + 1) : "")}
                      draggable
                      onDragEnd={(e) =>
                        setTokoLocation.mutateAsync({ id: t.id, lat: e.latLng.lat(), lng: e.latLng.lng(), source: "manual" })
                      }
                      onClick={() => setActiveMarker({ kind: "toko", data: t })}
                      title={t.nama}
                    />
                  );
                }
                const p = it.data;
                return (
                  <Marker
                    key={`p-${p.id}`}
                    position={{ lat: p.lat, lng: p.lng }}
                    icon={pinIcon(maps, isApproxPin(p) ? PIN.pelApprox : PIN.pelPasti)}
                    onClick={() => setActiveMarker({ kind: "pelanggan", data: p })}
                    title={p.nama}
                  />
                );
              })}

              {activeMarker && (
                <InfoWindow
                  position={{ lat: activeMarker.data.lat, lng: activeMarker.data.lng }}
                  onCloseClick={() => setActiveMarker(null)}
                >
                  <div className="text-xs text-gray-800 max-w-[220px] space-y-1">
                    <p className="font-semibold">{activeMarker.data.nama}</p>
                    {activeMarker.kind === "toko" && (
                      <p className="text-gray-600">
                        {STATUS_APPROACH_LABEL[activeMarker.data.status_approach] ?? activeMarker.data.status_approach}
                        {activeMarker.data.kesan ? ` · ${KESAN_LABEL[activeMarker.data.kesan] ?? activeMarker.data.kesan}` : ""}
                      </p>
                    )}
                    {(activeMarker.data.alamat || activeMarker.data.daerah) && (
                      <p className="text-gray-500">{activeMarker.data.alamat || activeMarker.data.daerah}</p>
                    )}
                    {activeMarker.kind === "pelanggan" && isApproxPin(activeMarker.data) && (
                      <p className="text-amber-600">Lokasi perkiraan</p>
                    )}
                    <div className="flex gap-3 pt-1 text-[11px] font-semibold uppercase">
                      {activeMarker.kind === "toko" && (
                        <button type="button" onClick={() => toggleSelect(activeMarker.data)} className="text-[#A8925A] underline">
                          {selected.has(activeMarker.data.id) ? "Batal rute" : "+ Rute"}
                        </button>
                      )}
                      {activeMarker.data.no_hp && (
                        <a
                          href={buildWaLink(activeMarker.data.no_hp, `Halo ${activeMarker.data.nama}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-700 underline"
                        >
                          WA
                        </a>
                      )}
                    </div>
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

      <PetaTerdekat
        items={nearest}
        selected={selected}
        onToggle={toggleSelect}
        onSelectAll={selectAllNearest}
        onClose={() => setNearest([])}
      />

      {selected.size > 0 && (
        <div className="px-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleHitungRute}
            disabled={computingRoute}
            className="px-3 py-2 text-xs font-editorial tracking-[0.05em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {computingRoute ? "Menghitung..." : `Urutkan Rute (${selected.size})`}
          </button>
          {route && (
            <span className="text-xs text-skin-text3">
              ≈ {route.totalKm.toFixed(1)} km
              {route.directionsResult ? ` · ${Math.round(route.totalMinutes)} mnt` : " (garis lurus)"}
            </span>
          )}
          {gmapsUrl && (
            <a href={gmapsUrl} target="_blank" rel="noreferrer" className="text-xs text-[#A8925A] underline">
              Buka di Google Maps
            </a>
          )}
        </div>
      )}

      <div className="px-4">
        <div className="border border-skin-bdr-lt bg-skin-card">
          <PetaTokoChecklist tokoList={checklistToko} selected={selected} onToggle={toggleSelect} />
        </div>
      </div>
      {showCari && <PetaCariToko tokoList={tokoList} center={userPoint} onClose={() => setShowCari(false)} />}
    </div>
  );
}
