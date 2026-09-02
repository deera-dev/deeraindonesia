/**
 * features/profiles/hooks.js
 * PUBLIC SURFACE fitur profiles — komponen HANYA boleh import dari sini.
 */
import { useProfilesQuery } from "./queries";

export function useProfiles() {
  const { data, isLoading } = useProfilesQuery();
  return { profiles: data ?? [], loading: isLoading };
}
