export {
  useTokoListQuery,
  useCreateTokoMutation,
  useUpdateTokoMutation,
  useDeleteTokoMutation,
  useTokoItemsQuery,
  useCreateKirimanMutation,
  useUpdateItemStatusMutation,
  useSetTokoLocationMutation,
} from "./queries";
export {
  summarizeTokoItems,
  latestItemByKode,
  STATUS_LABEL,
  summarizeByDaerah,
  distinctDaerahList,
  STATUS_APPROACH_LABEL,
  KESAN_LABEL,
  buildGeocodeQuery,
  buildGeocodeQueries,
  tokoWithLocation,
  tokoNeedingGeocode,
  buildGmapsDirUrl,
  guessDaerahFromAddress,
  isDuplicateToko,
  buildTokoPayloadFromPlace,
  clusterPoints,
  parseSosmed,
  buildGmapsPlaceUrl,
  mapStyles,
} from "./utils";

import { useMemo } from "react";
import { useTheme } from "@deera/shared/features/theme/hooks";
import { mapStyles } from "./utils";
import { usePetaRencanaStore } from "./store";

export function usePetaRencana() {
  const selectedIds = usePetaRencanaStore((s) => s.selectedIds);
  const toggle = usePetaRencanaStore((s) => s.toggle);
  const addMany = usePetaRencanaStore((s) => s.addMany);
  const clear = usePetaRencanaStore((s) => s.clear);
  return { selectedIds, toggle, addMany, clear };
}

export function useMapStyles() {
  const { isDark } = useTheme();
  return useMemo(() => mapStyles(isDark), [isDark]);
}
