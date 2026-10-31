import { toast } from "@deera/shared/features/toast/hooks";
import { loadGoogleMaps } from "@deera/shared/lib/geocode";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMapStyles } from "../hooks";
import PetaSearchBox from "./PetaSearchBox";

const DEFAULT_CENTER = { lat: -2.5, lng: 118 };
const MAP_STYLE = { height: "100%", width: "100%" };
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
};
const PIN_SIZE = { w: 28, h: 37 };

export default function TokoPinPicker({ value, onChange }) {
  const mapStyle = useMapStyles();
  const mapOptions = useMemo(() => ({ ...MAP_OPTIONS, styles: mapStyle }), [mapStyle]);
  const [maps, setMaps] = useState(null);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);
  const initial = useRef(value ?? DEFAULT_CENTER);
  const icon = useMemo(
    () =>
      maps && {
        url: "/pin-deera-kuning.png",
        scaledSize: new maps.Size(PIN_SIZE.w, PIN_SIZE.h),
        anchor: new maps.Point(PIN_SIZE.w / 2, PIN_SIZE.h),
      },
    [maps],
  );

  useEffect(() => {
    loadGoogleMaps()
      .then(setMaps)
      .catch((err) => setError(err.message ?? "Gagal memuat Google Maps"));
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!value || !m) return;
    m.panTo(value);
    if ((m.getZoom() ?? 0) < 15) m.setZoom(16);
  }, [value]);

  function handleLocate() {
    if (!("geolocation" in navigator)) return toast.error("Browser ini tidak mendukung GPS.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Gagal mengambil lokasi - cek izin lokasi browser.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <PetaSearchBox
        onPick={(loc, label) => onChange(loc, label)}
        onLocate={handleLocate}
        locating={locating}
      />
      <div className="h-[220px] border border-skin-bdr overflow-hidden">
        {error && (
          <div className="h-full flex items-center justify-center text-xs text-red-500 px-3 text-center">
            {error}
          </div>
        )}
        {!error && !maps && (
          <div className="h-full flex items-center justify-center text-xs text-skin-text3">
            Memuat peta...
          </div>
        )}
        {maps && (
          <GoogleMap
            mapContainerStyle={MAP_STYLE}
            center={initial.current}
            zoom={value ? 16 : 5}
            onLoad={(m) => (mapRef.current = m)}
            onClick={(e) => onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
            options={mapOptions}
          >
            {value && (
              <Marker
                position={value}
                draggable
                onDragEnd={(e) => onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                icon={icon}
              />
            )}
          </GoogleMap>
        )}
      </div>
      <p className="text-[11px] text-skin-text4">
        Cari alamat, ketuk peta, atau geser pin untuk menentukan titik.
      </p>
    </div>
  );
}
