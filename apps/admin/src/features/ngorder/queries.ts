import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  addRencana,
  createKiriman,
  createToko,
  deleteToko,
  fetchKunjunganToko,
  fetchRencana,
  fetchTokoItems,
  fetchTokoList,
  markGeocodeFailed,
  removeRencana,
  resolveGoogleMapsLink,
  setTokoLocation,
  subscribeNgorder,
  updateItemStatus,
  updateKunjungan,
  updateToko,
} from "./api";
import type { Actor, ItemStatus, TokoKunjungan, TokoPatch } from "./schema";

export const sampelKeys = {
  tokoList: ["ngorder", "toko-list"],
  tokoItems: (tokoId: string | null | undefined) => ["ngorder", "toko-items", tokoId],
  rencana: ["ngorder", "rencana"],
  kunjungan: (tokoId: string | null | undefined) => ["ngorder", "kunjungan", tokoId],
};

export function useTokoListQuery() {
  return useQuery({ queryKey: sampelKeys.tokoList, queryFn: fetchTokoList });
}

export function useCreateTokoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createToko,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useUpdateTokoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TokoPatch }) => updateToko(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useDeleteTokoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteToko,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useTokoItemsQuery(tokoId: string | null | undefined) {
  return useQuery({
    queryKey: sampelKeys.tokoItems(tokoId),
    queryFn: () => fetchTokoItems(tokoId!),
    enabled: !!tokoId,
  });
}

export function useCreateKirimanMutation(tokoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createKiriman,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoItems(tokoId) }),
  });
}

export function useUpdateItemStatusMutation(tokoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ItemStatus }) =>
      updateItemStatus(itemId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoItems(tokoId) }),
  });
}

export function useSetTokoLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      lat,
      lng,
      source,
    }: {
      id: string;
      lat: number;
      lng: number;
      source: string;
    }) => setTokoLocation(id, { lat, lng, source }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useMarkGeocodeFailedMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markGeocodeFailed,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useRencanaQuery() {
  return useQuery({ queryKey: sampelKeys.rencana, queryFn: fetchRencana });
}

export function useKunjunganTokoQuery(tokoId: string | null | undefined) {
  return useQuery({
    queryKey: sampelKeys.kunjungan(tokoId),
    queryFn: () => fetchKunjunganToko(tokoId!),
    enabled: !!tokoId,
  });
}

function useOptimisticRencana<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (old: TokoKunjungan[], vars: TVars) => TokoKunjungan[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await qc.cancelQueries({ queryKey: sampelKeys.rencana });
      const prev = qc.getQueryData<TokoKunjungan[]>(sampelKeys.rencana);
      qc.setQueryData<TokoKunjungan[]>(sampelKeys.rencana, (old) => apply(old ?? [], vars));
      return { prev };
    },
    onError: (_err: unknown, _vars: TVars, ctx: { prev?: TokoKunjungan[] } | undefined) =>
      qc.setQueryData(sampelKeys.rencana, ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sampelKeys.rencana });
      qc.invalidateQueries({ queryKey: ["ngorder", "kunjungan"] });
    },
  });
}

export function useAddRencanaMutation() {
  return useOptimisticRencana<{ tokoIds: string[]; user: Actor }>(
    addRencana,
    (old, { tokoIds, user }) => {
      const have = new Set(old.map((r) => r.toko_id));
      const now = new Date().toISOString();
      const added: TokoKunjungan[] = [...new Set(tokoIds)]
        .filter((id) => !have.has(id))
        .map((toko_id) => ({
          id: `tmp-${toko_id}`,
          toko_id,
          status: "rencana" as const,
          aktif: true,
          hasil: null,
          request: null,
          kesan: null,
          dipilih_oleh_nama: user?.name ?? user?.email ?? null,
          created_at: now,
        }));
      return [...old, ...added];
    },
  );
}

export function useRemoveRencanaMutation() {
  return useOptimisticRencana<TokoKunjungan[]>(removeRencana, (old, rows) => {
    const ids = new Set(rows.map((r) => r.id));
    return old.filter((r) => !ids.has(r.id));
  });
}

export function useUpdateKunjunganMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateKunjungan,
    onSuccess: (row: TokoKunjungan) => {
      qc.setQueryData<TokoKunjungan[]>(sampelKeys.rencana, (old) =>
        (old ?? []).map((r) => (r.id === row.id ? row : r)),
      );
      qc.invalidateQueries({ queryKey: sampelKeys.rencana });
      qc.invalidateQueries({ queryKey: sampelKeys.kunjungan(row.toko_id) });
      if (row.status === "selesai") qc.invalidateQueries({ queryKey: sampelKeys.tokoList });
    },
  });
}

export function useResolveGoogleMapsLinkMutation() {
  return useMutation({ mutationFn: resolveGoogleMapsLink });
}

export function useNgorderRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();
    const unsubscribe = subscribeNgorder((kind, payload) => {
      pending.add(kind);
      const tokoId = payload?.new?.toko_id ?? payload?.old?.toko_id;
      if (kind === "kunjungan" && tokoId)
        qc.invalidateQueries({ queryKey: sampelKeys.kunjungan(tokoId) });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending.has("kunjungan")) qc.invalidateQueries({ queryKey: sampelKeys.rencana });
        if (pending.has("toko")) qc.invalidateQueries({ queryKey: sampelKeys.tokoList });
        pending.clear();
      }, 400);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [qc]);
}
