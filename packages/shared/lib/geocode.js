import { setOptions, importLibrary as importMapsLibrary } from "@googlemaps/js-api-loader";
import { mapQuota } from "@deera/shared/features/map-quota/hooks";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
    setOptions({ key: API_KEY, v: "weekly" });
    loaderPromise = Promise.all([
      importMapsLibrary("maps"),
      importMapsLibrary("marker"),
      importMapsLibrary("geocoding"),
      importMapsLibrary("routes"),
      importMapsLibrary("places"),
    ]).then(() => window.google.maps);
  }
  return loaderPromise;
}

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

export async function geocodeAddressMulti(queries, { delayMs = 0 } = {}) {
  const list = [...new Set((queries ?? []).map((q) => (q ?? "").trim()).filter(Boolean))];
  for (let i = 0; i < list.length; i++) {
    let loc = null;
    try {
      loc = await geocodeAddress(list[i]);
    } catch (err) {
      if (err?.quotaExceeded) throw err;
      loc = null;
    }
    if (loc) return { ...loc, matchedQuery: list[i] };
    if (delayMs && i < list.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export async function createPlacesSessionToken() {
  const maps = await loadGoogleMaps();
  return new maps.places.AutocompleteSessionToken();
}

export async function searchPlaceSuggestions(input, sessionToken) {
  const q = (input ?? "").trim();
  if (q.length < 3) return [];
  const maps = await loadGoogleMaps();
  const { suggestions } = await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: q,
    sessionToken,
    includedRegionCodes: ["id"],
  });
  return (suggestions ?? [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      id: s.placePrediction.placeId,
      text: s.placePrediction.text?.text ?? "",
      prediction: s.placePrediction,
    }));
}

export async function getPlaceLocation(prediction) {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ["location"] });
  const loc = place.location;
  return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
}

export async function searchPlacesText(query, { center = null, max = 20 } = {}) {
  const q = (query ?? "").trim();
  if (q.length < 3) return [];
  if (!mapQuota.tryConsume("placesSearch")) throw quotaExceededError("placesSearch", "pencarian toko Google");
  const maps = await loadGoogleMaps();
  const req = {
    textQuery: q,
    fields: ["id", "displayName", "formattedAddress", "location"],
    region: "id",
    language: "id",
    maxResultCount: max,
  };
  if (center) req.locationBias = { center, radius: 50000 };
  const { places } = await maps.places.Place.searchByText(req);
  return (places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      id: p.id,
      nama: p.displayName ?? "",
      alamat: p.formattedAddress ?? "",
      lat: p.location.lat(),
      lng: p.location.lng(),
      place: p,
    }));
}

export async function fetchPlaceDetails(place) {
  if (!mapQuota.tryConsume("placeDetails")) throw quotaExceededError("placeDetails", "detail tempat Google");
  await place.fetchFields({
    fields: ["nationalPhoneNumber", "rating", "userRatingCount", "regularOpeningHours", "websiteURI"],
  });
  return {
    noHp: place.nationalPhoneNumber ?? "",
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    website: place.websiteURI ?? "",
    jamBuka: place.regularOpeningHours?.weekdayDescriptions ?? [],
  };
}

export async function rankNearestByRoad(origin, points, { top = 8 } = {}) {
  const candidates = (points ?? [])
    .filter((p) => p && p.lat != null && p.lng != null)
    .map((p) => ({ p, km: haversineKm(origin, p) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, top);
  if (!candidates.length) return [];
  const estimate = () =>
    candidates.map((c) => ({ ...c.p, distanceKm: c.km, durationMin: null, isEstimate: true }));
  if (!mapQuota.tryConsume("routeMatrix", candidates.length)) throw quotaExceededError("routeMatrix", "rute terdekat");
  try {
    await loadGoogleMaps();
    const { RouteMatrix } = await importMapsLibrary("routes");
    const { matrix } = await RouteMatrix.computeRouteMatrix({
      origins: [{ lat: origin.lat, lng: origin.lng }],
      destinations: candidates.map((c) => ({ lat: c.p.lat, lng: c.p.lng })),
      travelMode: "DRIVING",
      fields: ["distanceMeters", "durationMillis", "condition"],
    });
    const items = matrix?.rows?.[0]?.items ?? [];
    return candidates
      .map((c, i) => {
        const it = items[i];
        if (!it || it.distanceMeters == null) return { ...c.p, distanceKm: c.km, durationMin: null, isEstimate: true };
        return {
          ...c.p,
          distanceKm: it.distanceMeters / 1000,
          durationMin: it.durationMillis != null ? it.durationMillis / 60000 : null,
          isEstimate: false,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } catch {
    return estimate();
  }
}

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
