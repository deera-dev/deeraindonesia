import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const importLibraryMock = vi.fn(() => Promise.resolve());
const setOptionsMock = vi.fn();
vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: (...args) => setOptionsMock(...args),
  importLibrary: (...args) => importLibraryMock(...args),
}));

// Reset module registry tiap test supaya singleton `loaderPromise` di
// geocode.js tidak "bocor" antar test (modul di-reimport fresh).
async function importGeocode() {
  vi.resetModules();
  return await import("./geocode.js");
}

function setupGoogleMapsMock({ geocodeImpl, directionsImpl } = {}) {
  global.window.google = {
    maps: {
      Geocoder: class {
        geocode(req, cb) {
          (geocodeImpl ?? (() => cb([], "ZERO_RESULTS")))(req, cb);
        }
      },
      DirectionsService: class {
        route(req, cb) {
          (directionsImpl ?? (() => cb(null, "UNKNOWN_ERROR")))(req, cb);
        }
      },
      TravelMode: { DRIVING: "DRIVING" },
    },
  };
}

beforeEach(() => {
  importLibraryMock.mockClear();
  setOptionsMock.mockClear();
  setupGoogleMapsMock();
});

afterEach(() => {
  delete global.window.google;
});

describe("loadGoogleMaps", () => {
  it("memanggil setOptions SEKALI lalu importLibrary utk semua library yang dibutuhkan, resolve ke google.maps", async () => {
    const { loadGoogleMaps } = await importGeocode();
    const maps = await loadGoogleMaps();
    expect(maps).toBe(window.google.maps);
    expect(setOptionsMock).toHaveBeenCalledTimes(1);
    expect(importLibraryMock).toHaveBeenCalledWith("maps");
    expect(importLibraryMock).toHaveBeenCalledWith("marker");
    expect(importLibraryMock).toHaveBeenCalledWith("geocoding");
    expect(importLibraryMock).toHaveBeenCalledWith("routes");
    expect(importLibraryMock).toHaveBeenCalledWith("places");
  });

  it("hanya memanggil setOptions SEKALI (singleton loaderPromise) walau loadGoogleMaps dipanggil berkali-kali", async () => {
    const { loadGoogleMaps } = await importGeocode();
    await loadGoogleMaps();
    await loadGoogleMaps();
    await loadGoogleMaps();
    expect(setOptionsMock).toHaveBeenCalledTimes(1);
  });
});

describe("geocodeAddress", () => {
  it("mengembalikan null kalau query kosong, tanpa memanggil Geocoder", async () => {
    const { geocodeAddress } = await importGeocode();
    expect(await geocodeAddress("")).toBeNull();
    expect(await geocodeAddress("   ")).toBeNull();
    expect(importLibraryMock).not.toHaveBeenCalled();
  });

  it("mem-parse hasil pertama Geocoder jadi {lat, lng}", async () => {
    setupGoogleMapsMock({
      geocodeImpl: (req, cb) =>
        cb(
          [{ geometry: { location: { lat: () => -7.4478, lng: () => 112.7183 } } }],
          "OK",
        ),
    });
    const { geocodeAddress } = await importGeocode();
    const result = await geocodeAddress("Sidoarjo, Indonesia");
    expect(result).toEqual({ lat: -7.4478, lng: 112.7183 });
  });

  it("mengembalikan null kalau status ZERO_RESULTS", async () => {
    setupGoogleMapsMock({ geocodeImpl: (req, cb) => cb([], "ZERO_RESULTS") });
    const { geocodeAddress } = await importGeocode();
    expect(await geocodeAddress("alamat yang tidak ketemu sama sekali")).toBeNull();
  });

  it("melempar error kalau status selain OK/ZERO_RESULTS", async () => {
    setupGoogleMapsMock({ geocodeImpl: (req, cb) => cb(null, "OVER_QUERY_LIMIT") });
    const { geocodeAddress } = await importGeocode();
    await expect(geocodeAddress("x")).rejects.toThrow("OVER_QUERY_LIMIT");
  });
});

describe("geocodeAddressMulti", () => {
  it("berhenti di query pertama yang berhasil, tidak lanjut ke fallback", async () => {
    const geocodeImpl = vi.fn((req, cb) =>
      cb([{ geometry: { location: { lat: () => -7.1, lng: () => 112.1 } } }], "OK"),
    );
    setupGoogleMapsMock({ geocodeImpl });
    const { geocodeAddressMulti } = await importGeocode();
    const result = await geocodeAddressMulti(["Jl. A, Sidoarjo, Indonesia", "Sidoarjo, Indonesia"]);
    expect(result).toEqual({ lat: -7.1, lng: 112.1, matchedQuery: "Jl. A, Sidoarjo, Indonesia" });
    expect(geocodeImpl).toHaveBeenCalledTimes(1);
  });

  it("fallback ke query berikutnya kalau query pertama 0 hasil", async () => {
    let call = 0;
    setupGoogleMapsMock({
      geocodeImpl: (req, cb) => {
        call++;
        if (call === 1) return cb([], "ZERO_RESULTS");
        return cb([{ geometry: { location: { lat: () => -7.4, lng: () => 112.7 } } }], "OK");
      },
    });
    const { geocodeAddressMulti } = await importGeocode();
    const result = await geocodeAddressMulti(["alamat super detail yang tidak ketemu", "Sidoarjo, Indonesia"]);
    expect(result).toEqual({ lat: -7.4, lng: 112.7, matchedQuery: "Sidoarjo, Indonesia" });
  });

  it("null kalau SEMUA query gagal", async () => {
    setupGoogleMapsMock({ geocodeImpl: (req, cb) => cb([], "ZERO_RESULTS") });
    const { geocodeAddressMulti } = await importGeocode();
    expect(await geocodeAddressMulti(["a", "b"])).toBeNull();
  });

  it("de-dupe query yang sama persis, list kosong -> null tanpa panggil Geocoder", async () => {
    const { geocodeAddressMulti } = await importGeocode();
    expect(await geocodeAddressMulti([])).toBeNull();
    expect(await geocodeAddressMulti([null, "", "  "])).toBeNull();
    expect(importLibraryMock).not.toHaveBeenCalled();
  });
});

describe("haversineKm", () => {
  it("jarak titik yang sama = 0", async () => {
    const { haversineKm } = await importGeocode();
    const p = { lat: -7.25, lng: 112.75 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("jarak Surabaya-Sidoarjo kira-kira masuk akal (~15-35km garis lurus)", async () => {
    const { haversineKm } = await importGeocode();
    const surabaya = { lat: -7.2575, lng: 112.7521 };
    const sidoarjo = { lat: -7.4478, lng: 112.7183 };
    const km = haversineKm(surabaya, sidoarjo);
    expect(km).toBeGreaterThan(15);
    expect(km).toBeLessThan(35);
  });
});

describe("nearestNeighborRoute (fallback garis lurus)", () => {
  it("urutkan titik dari yang paling dekat ke titik berikutnya (greedy)", async () => {
    const { nearestNeighborRoute } = await importGeocode();
    const start = { lat: 0, lng: 0 };
    const a = { id: "a", lat: 0, lng: 1 };
    const b = { id: "b", lat: 0, lng: 5 };
    const c = { id: "c", lat: 0, lng: 2 };
    const { order } = nearestNeighborRoute([b, a, c], start);
    expect(order.map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("totalKm = jumlah jarak tiap segmen berurutan", async () => {
    const { nearestNeighborRoute, haversineKm } = await importGeocode();
    const start = { lat: 0, lng: 0 };
    const a = { id: "a", lat: 0, lng: 1 };
    const { order, totalKm } = nearestNeighborRoute([a], start);
    expect(order).toEqual([a]);
    expect(totalKm).toBeCloseTo(haversineKm(start, a), 5);
  });

  it("list kosong -> order [] totalKm 0", async () => {
    const { nearestNeighborRoute } = await importGeocode();
    const result = nearestNeighborRoute([], { lat: 0, lng: 0 });
    expect(result).toEqual({ order: [], totalKm: 0 });
  });
});

describe("computeOptimizedRoute", () => {
  it("null kalau stops kosong, tanpa memanggil Google sama sekali", async () => {
    const { computeOptimizedRoute } = await importGeocode();
    expect(await computeOptimizedRoute({ lat: 0, lng: 0 }, [])).toBeNull();
    expect(importLibraryMock).not.toHaveBeenCalled();
  });

  it("satu stop -> rute langsung origin -> stop itu, TANPA optimizeWaypoints", async () => {
    const routeImpl = vi.fn((req, cb) =>
      cb(
        {
          routes: [
            {
              legs: [{ distance: { value: 5000 }, duration: { value: 600 } }],
              waypoint_order: [],
            },
          ],
        },
        "OK",
      ),
    );
    setupGoogleMapsMock({ directionsImpl: routeImpl });
    const { computeOptimizedRoute } = await importGeocode();
    const stop = { id: "t1", lat: -7.1, lng: 112.1 };
    const result = await computeOptimizedRoute({ lat: -7.0, lng: 112.0 }, [stop]);
    expect(result.order).toEqual([stop]);
    expect(result.totalKm).toBeCloseTo(5, 5);
    expect(result.totalMinutes).toBeCloseTo(10, 5);
    expect(routeImpl.mock.calls[0][0].optimizeWaypoints).toBe(false);
  });

  it("multi-stop: toko TERJAUH (haversine) dijadikan destinasi fixed, sisanya waypoint dioptimasi", async () => {
    const dekat = { id: "dekat", lat: -7.01, lng: 112.01 };
    const jauh = { id: "jauh", lat: -8.5, lng: 113.5 }; // jauh banget dari origin
    const origin = { lat: -7.0, lng: 112.0 };

    const routeImpl = vi.fn((req, cb) =>
      cb(
        {
          routes: [
            {
              legs: [
                { distance: { value: 2000 }, duration: { value: 300 } },
                { distance: { value: 9000 }, duration: { value: 900 } },
              ],
              waypoint_order: [0],
            },
          ],
        },
        "OK",
      ),
    );
    setupGoogleMapsMock({ directionsImpl: routeImpl });
    const { computeOptimizedRoute } = await importGeocode();

    const result = await computeOptimizedRoute(origin, [dekat, jauh]);

    const sentReq = routeImpl.mock.calls[0][0];
    expect(sentReq.destination).toEqual({ lat: jauh.lat, lng: jauh.lng });
    expect(sentReq.waypoints).toEqual([{ location: { lat: dekat.lat, lng: dekat.lng }, stopover: true }]);
    expect(sentReq.optimizeWaypoints).toBe(true);
    expect(result.order).toEqual([dekat, jauh]);
    expect(result.totalKm).toBeCloseTo(11, 5);
    expect(result.totalMinutes).toBeCloseTo(20, 5);
    expect(result.directionsResult).toBeTruthy();
  });

  it("melempar error kalau Directions API gagal (pemanggil yg jatuh ke fallback haversine)", async () => {
    setupGoogleMapsMock({ directionsImpl: (req, cb) => cb(null, "OVER_QUERY_LIMIT") });
    const { computeOptimizedRoute } = await importGeocode();
    await expect(
      computeOptimizedRoute({ lat: 0, lng: 0 }, [{ id: "a", lat: 1, lng: 1 }]),
    ).rejects.toThrow("OVER_QUERY_LIMIT");
  });
});
