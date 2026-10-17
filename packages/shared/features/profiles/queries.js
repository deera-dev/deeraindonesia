import { useQuery } from "@tanstack/react-query";
import { fetchAllProfiles } from "./api";

export const profilesKeys = {
  all: ["profiles"],
};

export function useProfilesQuery() {
  return useQuery({
    queryKey: profilesKeys.all,
    queryFn: fetchAllProfiles,
    staleTime: 5 * 60 * 1000,
  });
}
