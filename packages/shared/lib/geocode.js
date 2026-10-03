/**
 * lib/geocode.js — Geocoding & rute kunjungan via Google Maps Platform
 * (permintaan Denny 2026-10: ganti dari OpenStreetMap/Nominatim ke Google
 * Maps karena sudah punya billing + free credit bulanan, dan mau rute jalan
 * ASLI — bukan cuma estimasi garis lurus — untuk "Urutkan Kunjungan").
 *
 * Butuh env var `VITE_GOOGLE_MAPS_API_KEY` (lihat CLAUDE.md §11) — JANGAN
 * commit key asli ke repo, isi di file `.env` lokal tiap developer/server
 * saja (sudah di .gitignore).
 *
 * `loadGoogleMaps()` adalah SATU-SATUNYA titik load script Google Maps JS
 * API di seluruh app — dipakai baik oleh fungsi geocoding/routing di file
 * ini MAUPUN komponen peta (<GoogleMap>/<Marker>/<DirectionsRenderer> di
 * features/ngorder/components/PetaTab.jsx). PetaTab SENGAJA TIDAK memakai
 * loader bawaan @react-google-maps/api (useJsApiLoader/<LoadScript>) —
 * @googlemaps/js-api-loader yang dipakai lib itu adalah singleton yang
 * throw error kalau dipanggil 2x dengan opsi berbeda, jadi kalau dua
 * loader terpisah jalan sendiri-sendiri gampang konflik. PetaTab cukup
 * menunggu `loadGoogleMaps()` resolve (via state `mapsReady`) sebelum
 * merender komponen peta — komponen @react-google-maps/api sendiri tidak
 * perlu loader-nya dipakai, cuma butuh `window.google.maps` sudah ada.
 *
 * `computeOptimizedRoute()` memakai Directions API dgn `optimizeWaypoints:
 * true` utk urutan kunjungan TSP-ish mengikuti jalan sungguhan (bukan
 * garis lurus lagi). Google HANYA bisa optimize waypoint DI ANTARA
 * origin-destination yang FIXED, jadi toko TERJAUH dari titik awal
 * (haversine, cuma dipakai sbg heuristik pemilihan, bukan hasil akhir)
 * dijadikan destinasi akhir, sisanya jadi waypoint yang diizinkan diurutkan
 * ulang oleh Google.
 *
 * `haversineKm`/`nearestNeighborRoute` DIPERTAHANKAN sebagai FALLBACK kalau
 * Directions API gagal (kuota habis, network error, dst) — PetaTab
 * menangkap error lalu jatuh ke estimasi garis lurus supaya fitur tidak
 * mati total kalau Google API bermasalah sesaat.
 */
import { setOptions, importLibrary as importMapsLibrary } from "@googlemaps/js-api-loader";
import { mapQuota } from "@deera/shared/features/map-quota/hooks";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Dibuang kalau batas harian map-quota (lihat @deera/shared/features/
// map-quota) sudah tercapai — ditandai `quotaExceeded: true` supaya
// pemanggil (geocodeAddressMulti, dst) bisa langsung berhenti coba
// fallback lain, bukan dianggap "alamat tidak ketemu" biasa.
function quotaExceededError(kind, label) {
  const err = new Error(
    `Kuota ${label} harian sudah habis (maks ${mapQuota.limit(kind)}x/hari) — coba lagi besok, atau input/geser titik lokasi manual langsung di peta.`,
  );
  err.quotaExceeded = true;
  return err;
}

let loaderPromise = null;

export function loadGoogleMaps() {
  if (!loaderPromise) {
    // @googlemaps/js-api-loader v2.1.3+ menghapus class `Loader` (sekarang
    // cuma stub deprecated yang throw kalau di-`new`) — API baru dipakai lewat
    // 2 fungsi top-level: `setOptions()` dipanggil SEKALI utk set apiKey +
    // versi sblm library apapun di-import, lalu `importLibrary(nama)` dipanggil
    // per-library (boleh berkali-kali, aman dipanggil paralel via Promise.all).
    // `loaderPromise` di sini tetap dipertahankan sbg singleton cache module-
    // level spy supaya `loadGoogleMaps()` yang dipanggil berkali-kali dari
    // tempat berbeda (geocode.js sendiri + PetaTab.jsx) tidak trigger
    // setOptions/importLibrary berulang.
    setOptions({ key: API_KEY, v: "weekly" });
    loaderPromise = Promise.all([
      importMapsLibrary("maps"),
      importMapsLibrary("marker"),
      importMapsLibrary("geocoding"),
      importMapsLibrary("routes"),
      // "places" (permintaan Denny 2026-10: search box utk set "titik Anda"
      // langsung dari hasil cari alamat, bukan cuma GPS/klik manual) —
      // dipakai <Autocomplete> dari @react-google-maps/api di PetaTab.jsx.
      importMapsLibrary("places"),
    ]).then(() => window.google.maps);
  }
  return loaderPromise;
}

/**
 * geocodeAddress(query) → { lat, lng } | null
 * `query` idealnya sudah termasuk konteks kota/negara (mis. "Jl. ABC,
 * Sidoarjo, Indonesia") — pemanggil (features/ngorder/utils.js
 * buildGeocodeQuery) yang menyusun ini.
 */
export async function geocodeAddress(query) {
  const q = (query ?? "").trim();
  if (!q) return null;
  if (!mapQuota.tryConsume("geocoding")) throw quotaExceededError("geocoding", "geocoding");
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: q, region: "id" }, (results, status) => {
      if (status === "OK" && results?.length) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else if (status === "ZERO_RESULTS") {
        resolve(null);
      } else {
        reject(new Error(`Geocoding gagal (${status})`));
      }
    });
  });
}

/**
 * geocodeAddressMulti(queries) → { lat, lng, matchedQuery } | null
 *
 * Coba beberapa variasi query dari yang paling spesifik ke paling umum
 * (lihat `buildGeocodeQueries` di features/ngorder/utils.js) dan berhenti
 * di percobaan pertama yang berhasil — Geocoder Google jauh lebih lengkap
 * utk alamat Indonesia dibanding Nominatim/OSM, tapi fallback ini tetap
 * dipertahankan utk alamat yang ditulis tidak standar (typo, singkatan
 * aneh, dll). `delayMs` default 0 — TIDAK ada lagi hard rate-limit seperti
 * Nominatim (1 req/detik), Google Geocoder jauh lebih longgar.
 */
export async function geocodeAddressMulti(queries, { delayMs = 0 } = {}) {
  const list = [...new Set((queries ?? []).map((q) => (q ?? "").trim()).filter(Boolean))];
  for (let i = 0; i < list.length; i++) {
    let loc = null;
    try {
      loc = await geocodeAddress(list[i]);
    } catch (err) {
      if (err?.quotaExceeded) throw err; // jangan buang sisa kuota utk fallback yg pasti ditolak jg
      loc = null;
    }
    if (loc) return { ...loc, matchedQuery: list[i] };
    if (delayMs && i < list.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/** Jarak garis lurus antar 2 koordinat, dalam kilometer (rumus haversine). */
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * nearestNeighborRoute(points, start) — FALLBACK garis lurus (lihat
 * komentar atas file). Urutkan `points` mulai dari yang paling dekat ke
 * `start`, lalu dari situ ke titik berikutnya yang paling dekat, dst
 * (greedy nearest-neighbor — BUKAN TSP optimal).
 * @returns {{ order: object[], totalKm: number }}
 */
export function nearestNeighborRoute(points, start) {
  const remaining = [...(points ?? [])];
  const order = [];
  let current = start;
  let totalKm = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, idx) => {
      const d = haversineKm(current, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    order.push(next);
    totalKm += bestDist;
    current = next;
  }

  return { order, totalKm };
}

function routeDirections(maps, origin, destination, waypointStops) {
  if (!mapQuota.tryConsume("directions")) throw quotaExceededError("directions", "rute (Directions)");
  const service = new maps.DirectionsService();
  return new Promise((resolve, reject) => {
    service.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints: waypointStops.map((s) => ({ location: { lat: s.lat, lng: s.lng }, stopover: true })),
        optimizeWaypoints: waypointStops.length > 0,
        travelMode: maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") resolve(result);
        else reject(new Error(`Directions gagal (${status})`));
      },
    );
  });
}

function parseDirectionsResult(result, order) {
  const legs = result.routes[0].legs;
  const totalMeters = legs.reduce((sum, l) => sum + l.distance.value, 0);
  const totalSeconds = legs.reduce((sum, l) => sum + l.duration.value, 0);
  return {
    order,
    totalKm: totalMeters / 1000,
    totalMinutes: totalSeconds / 60,
    directionsResult: result,
  };
}

/**
 * computeOptimizedRoute(origin, stops) → { order, totalKm, totalMinutes, directionsResult } | null
 * Hitung urutan kunjungan TERBAIK mengikuti jalan sungguhan via Google
 * Directions API (`optimizeWaypoints: true`) — lihat komentar panjang di
 * atas file soal kenapa toko terjauh (haversine) dijadikan destinasi fixed.
 * `directionsResult` dipakai <DirectionsRenderer> di PetaTab utk gambar
 * rute asli ngikutin jalan (bukan garis lurus).
 */
export async function computeOptimizedRoute(origin, stops) {
  if (!stops?.length) return null;
  const maps = await loadGoogleMaps();

  if (stops.length === 1) {
    const result = await routeDirections(maps, origin, stops[0], []);
    return parseDirectionsResult(result, [stops[0]]);
  }

  let destIdx = 0;
  let destDist = -Infinity;
  stops.forEach((s, i) => {
    const d = haversineKm(origin, s);
    if (d > destDist) {
      destDist = d;
      destIdx = i;
    }
  });
  const destination = stops[destIdx];
  const waypointStops = stops.filter((_, i) => i !== destIdx);

  const result = await routeDirections(maps, origin, destination, waypointStops);
  const order = result.routes[0].waypoint_order.map((idx) => waypointStops[idx]);
  order.push(destination);
  return parseDirectionsResult(result, order);
}
