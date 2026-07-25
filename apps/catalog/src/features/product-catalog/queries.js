import { useQuery } from "@tanstack/react-query";
import { fetchSoldOutKodes, fetchLimitedStokKodes } from "./api";

export const soldOutKeys = { all: ["sold-out-kodes"] };
export const limitedStokKeys = { all: ["limited-stok-kodes"] };

export function useSoldOutKodesQuery() {
  return useQuery({
    queryKey: soldOutKeys.all,
    queryFn: fetchSoldOutKodes,
  });
}

export function useLimitedStokKodesQuery() {
  return useQuery({
    queryKey: limitedStokKeys.all,
    queryFn: fetchLimitedStokKodes,
  });
}
