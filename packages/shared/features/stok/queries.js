/**
 * features/stok/queries.js
 */
import { useQuery } from "@tanstack/react-query";
import { fetchStokByLocation } from "./api";

export const stokKeys = {
  byLocation: (location) => ["stok", "byLocation", location],
};

export function useStokByLocationQuery(location) {
  return useQuery({
    queryKey: stokKeys.byLocation(location),
    queryFn: () => fetchStokByLocation(location),
    enabled: !!location,
  });
}
