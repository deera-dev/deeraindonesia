import { useQuery } from "@tanstack/react-query";
import {
  fetchSoldOutKodes,
  fetchLimitedStokKodes,
  fetchBaruKodes,
  fetchTerlarisKodes,
} from "./api";

export const soldOutKeys = { all: ["sold-out-kodes"] };
export const limitedStokKeys = { all: ["limited-stok-kodes"] };
export const baruKeys = { all: ["baru-kodes"] };
export const terlarisKeys = { all: ["terlaris-kodes"] };

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

export function useBaruKodesQuery() {
  return useQuery({
    queryKey: baruKeys.all,
    queryFn: fetchBaruKodes,
  });
}

export function useTerlarisKodesQuery() {
  return useQuery({
    queryKey: terlarisKeys.all,
    queryFn: fetchTerlarisKodes,
  });
}
