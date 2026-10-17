import { useStokByLocationQuery } from "./queries";

export function useStokByLocation(location) {
  const { data, isLoading } = useStokByLocationQuery(location);
  return { items: data ?? [], loading: isLoading };
}
