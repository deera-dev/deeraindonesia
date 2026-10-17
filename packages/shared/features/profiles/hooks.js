import { useProfilesQuery } from "./queries";

export function useProfiles() {
  const { data, isLoading } = useProfilesQuery();
  return { profiles: data ?? [], loading: isLoading };
}
