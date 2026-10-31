import { useStokByLocationQuery } from "./queries";
import type { StokLocation } from "./schema";

export function useStokByLocation(location: StokLocation | "" | null | undefined) {
  const { data, isLoading } = useStokByLocationQuery(location);
  return { items: data ?? [], loading: isLoading };
}
