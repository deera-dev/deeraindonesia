/**
 * features/pelanggan/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPelangganList,
  fetchSalesByPelanggan,
  fetchPelangganPins,
  fetchPelangganNeedingGeocode,
  fetchPelangganNamaNeedingGeocode,
  setPelangganLocation,
} from "./api";

export const pelangganKeys = {
  list: ["pelanggan", "list"],
  salesByPelanggan: (id) => ["pelanggan", "sales", id],
  pins: ["pelanggan", "pins"],
  needingGeocode: ["pelanggan", "needing-geocode"],
  namaNeedingGeocode: ["pelanggan", "nama-needing-geocode"],
};

export function usePelangganListQuery() {
  return useQuery({ queryKey: pelangganKeys.list, queryFn: fetchPelangganList });
}

export function useSalesByPelangganQuery(pelangganId) {
  return useQuery({
    queryKey: pelangganKeys.salesByPelanggan(pelangganId),
    queryFn: () => fetchSalesByPelanggan(pelangganId),
    enabled: !!pelangganId,
  });
}

// ── Peta Ngorder ─────────────────────────────────────────────────────
export function usePelangganPinsQuery() {
  return useQuery({ queryKey: pelangganKeys.pins, queryFn: fetchPelangganPins });
}

export function usePelangganNeedingGeocodeQuery() {
  return useQuery({ queryKey: pelangganKeys.needingGeocode, queryFn: fetchPelangganNeedingGeocode });
}

export function usePelangganNamaNeedingGeocodeQuery() {
  return useQuery({ queryKey: pelangganKeys.namaNeedingGeocode, queryFn: fetchPelangganNamaNeedingGeocode });
}

export function useSetPelangganLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lat, lng, source }) => setPelangganLocation(id, { lat, lng, source }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pelangganKeys.pins });
      qc.invalidateQueries({ queryKey: pelangganKeys.needingGeocode });
      qc.invalidateQueries({ queryKey: pelangganKeys.namaNeedingGeocode });
    },
  });
}
