/**
 * features/profiles/queries.js
 */
import { useQuery } from "@tanstack/react-query";
import { fetchAllProfiles } from "./api";

export const profilesKeys = {
  all: ["profiles"],
};

export function useProfilesQuery() {
  return useQuery({
    queryKey: profilesKeys.all,
    queryFn: fetchAllProfiles,
    // Daftar user jarang berubah (staf baru tidak sering ditambah) — cache
    // 5 menit cukup, mengurangi query berulang tiap kali autocomplete
    // @mention dibuka.
    staleTime: 5 * 60 * 1000,
  });
}
