import { useAuth } from "@deera/shared/features/auth/hooks";
import { useTheme } from "@deera/shared/features/theme/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { geocodeAddressMulti } from "@deera/shared/lib/geocode";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAddRencanaMutation,
  useMarkGeocodeFailedMutation,
  useRemoveRencanaMutation,
  useRencanaQuery,
  useSetTokoLocationMutation,
  useUpdateKunjunganMutation,
} from "./queries";
import { clearLegacyRencana, readLegacyRencanaIds, usePetaFilterStore } from "./store";
import { buildGeocodeQueries, mapStyles, tokoAutoGeocodeQueue } from "./utils";

export {
  useCreateKirimanMutation,
  useCreateTokoMutation,
  useDeleteTokoMutation,
  useKunjunganTokoQuery,
  useNgorderRealtime,
  useSetTokoLocationMutation,
  useTokoItemsQuery,
  useTokoListQuery,
  useUpdateItemStatusMutation,
  useUpdateTokoMutation,
} from "./queries";
export {
  buildGeocodeQueries,
  buildGeocodeQuery,
  buildGmapsDirUrl,
  buildGmapsPlaceUrl,
  buildRencanaShareText,
  buildTokoPayloadFromPlace,
  clusterPoints,
  distinctDaerahList,
  filterToko,
  fmtJarak,
  guessDaerahFromAddress,
  isDuplicateToko,
  KESAN_LABEL,
  KUNJUNGAN_STATUS_LABEL,
  latestItemByKode,
  mapStyles,
  parseSosmed,
  STATUS_APPROACH_LABEL,
  STATUS_LABEL,
  sortRencana,
  summarizeByDaerah,
  summarizeRencana,
  summarizeTokoItems,
  tokoAutoGeocodeQueue,
  tokoNeedingGeocode,
  tokoWithLocation,
} from "./utils";

export function useCurrentActor() {
  const { user } = useAuth();
  return useMemo(
    () => ({
      email: user?.email ?? null,
      name: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? null,
    }),
    [user],
  );
}

const showError = (err) => toast.error(err?.message ?? "Gagal menyimpan rencana kunjungan.");

export function usePetaRencana() {
  const actor = useCurrentActor();
  const { data: rows = [], isLoading } = useRencanaQuery();
  const add = useAddRencanaMutation();
  const remove = useRemoveRencanaMutation();
  const update = useUpdateKunjunganMutation();
  const byToko = useMemo(() => new Map(rows.map((r) => [r.toko_id, r])), [rows]);

  function toggle(tokoId) {
    const row = byToko.get(tokoId);
    if (row?.id?.startsWith("tmp-")) return;
    if (row) remove.mutate([row], { onError: showError });
    else add.mutate({ tokoIds: [tokoId], user: actor }, { onError: showError });
  }

  return {
    rows,
    byToko,
    isLoading,
    toggle,
    addMany: (tokoIds) => add.mutate({ tokoIds, user: actor }, { onError: showError }),
    remove: (row) => remove.mutate([row], { onError: showError }),
    clear: (list = rows) =>
      remove.mutate(
        list.filter((r) => !r.id?.startsWith("tmp-")),
        { onError: showError },
      ),
    updateKunjungan: (row, patch) => update.mutateAsync({ row, patch, user: actor }),
    isUpdating: update.isPending,
  };
}

export function useMigrateLegacyRencana(tokoList, rencana) {
  const actor = useCurrentActor();
  const doneRef = useRef(false);
  const add = useAddRencanaMutation();

  useEffect(() => {
    if (doneRef.current || !actor.email || rencana.isLoading || !tokoList.length) return;
    doneRef.current = true;
    const legacy = readLegacyRencanaIds();
    if (!legacy.length) return;
    const known = new Set(tokoList.map((t) => t.id));
    const ids = legacy.filter((id) => known.has(id) && !rencana.byToko.has(id));
    if (!ids.length) {
      clearLegacyRencana();
      return;
    }
    add.mutate(
      { tokoIds: ids, user: actor },
      {
        onSuccess: () => {
          clearLegacyRencana();
          toast.success(
            `${ids.length} toko dari rencana lama di perangkat ini dipindahkan ke rencana bersama.`,
          );
        },
        onError: showError,
      },
    );
  }, [actor, tokoList, rencana.isLoading, rencana.byToko, add]);
}

export function useAutoGeocodeToko(tokoList, enabled) {
  const setLocation = useSetTokoLocationMutation();
  const markFailed = useMarkGeocodeFailedMutation();
  const [progress, setProgress] = useState(null);
  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const latestRef = useRef({ setLocation, markFailed });
  latestRef.current = { setLocation, markFailed };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    const queue = tokoAutoGeocodeQueue(tokoList);
    if (!queue.length) return;
    startedRef.current = true;
    (async () => {
      let ok = 0;
      setProgress({ done: 0, total: queue.length });
      for (let i = 0; i < queue.length && aliveRef.current; i++) {
        const t = queue[i];
        try {
          const loc = await geocodeAddressMulti(buildGeocodeQueries(t));
          if (loc) {
            await latestRef.current.setLocation.mutateAsync({
              id: t.id,
              lat: loc.lat,
              lng: loc.lng,
              source: "auto",
            });
            ok++;
          } else {
            await latestRef.current.markFailed.mutateAsync(t.id);
          }
        } catch (err) {
          if (err?.quotaExceeded) break;
        }
        if (aliveRef.current) setProgress({ done: i + 1, total: queue.length });
      }
      if (!aliveRef.current) return;
      setProgress(null);
      if (ok) toast.success(`${ok} toko otomatis ditaruh di peta.`);
    })();
  }, [enabled, tokoList]);

  return progress;
}

export function usePetaFilter() {
  const daerah = usePetaFilterStore((s) => s.daerah);
  const approach = usePetaFilterStore((s) => s.approach);
  const search = usePetaFilterStore((s) => s.search);
  const sheetTab = usePetaFilterStore((s) => s.sheetTab);
  const setFilter = usePetaFilterStore((s) => s.setFilter);
  const resetFilter = usePetaFilterStore((s) => s.resetFilter);
  return { daerah, approach, search, sheetTab, setFilter, resetFilter };
}

export function useMapStyles() {
  const { isDark } = useTheme();
  return useMemo(() => mapStyles(isDark), [isDark]);
}
