import {
  usePelangganListQuery,
  useSalesByPelangganQuery,
  usePelangganPinsQuery,
  usePelangganNeedingGeocodeQuery,
  usePelangganNamaNeedingGeocodeQuery,
  useSetPelangganLocationMutation,
} from "./queries";

export { searchPelanggan } from "./api";

export function usePelangganList() {
  const { data, isLoading, error } = usePelangganListQuery();
  return { pelanggan: data ?? [], loading: isLoading, error };
}

export function useSalesByPelanggan(pelangganId) {
  const { data, isLoading, error } = useSalesByPelangganQuery(pelangganId);
  return { sales: data ?? [], loading: isLoading, error };
}

export function usePelangganPins() {
  const { data, isLoading } = usePelangganPinsQuery();
  return { pins: data ?? [], loading: isLoading };
}

export { usePelangganNeedingGeocodeQuery, usePelangganNamaNeedingGeocodeQuery, useSetPelangganLocationMutation };
