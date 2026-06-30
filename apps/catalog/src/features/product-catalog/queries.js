import { useQuery } from "@tanstack/react-query";
import { fetchSoldOutKodes } from "./api";

export const soldOutKeys = { all: ["sold-out-kodes"] };

export function useSoldOutKodesQuery() {
  return useQuery({
    queryKey: soldOutKeys.all,
    queryFn: fetchSoldOutKodes,
  });
}
