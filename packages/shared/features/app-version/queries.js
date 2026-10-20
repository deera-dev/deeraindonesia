import { useQuery } from "@tanstack/react-query";
import { fetchLatestVersion } from "./api";

export const appVersionKeys = { latest: ["app-version", "latest"] };

export function useLatestVersionQuery() {
  return useQuery({
    queryKey: appVersionKeys.latest,
    queryFn: fetchLatestVersion,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 0,
  });
}
