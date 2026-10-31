import { useQuery } from "@tanstack/react-query";
import { fetchStokByLocation } from "./api";
import type { StokLocation } from "./schema";

export const stokKeys = {
  byLocation: (location: StokLocation | "" | null | undefined) => ["stok", "byLocation", location],
};

export function useStokByLocationQuery(location: StokLocation | "" | null | undefined) {
  return useQuery({
    queryKey: stokKeys.byLocation(location),
    queryFn: () => fetchStokByLocation(location),
    enabled: !!location,
  });
}
