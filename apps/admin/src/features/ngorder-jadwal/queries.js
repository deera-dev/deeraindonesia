/**
 * features/ngorder-jadwal/queries.js — TanStack Query membungkus api.js.
 * Hasil mutation langsung ditulis ke cache (setQueryData) supaya centang/
 * tambah biaya terasa instan, lalu di-invalidate utk sinkron dgn server.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrips, createTrip, updateTrip, deleteTrip } from "./api";

export const tripKeys = { all: ["ngorder-jadwal", "trips"] };

export function useTripsQuery() {
  return useQuery({ queryKey: tripKeys.all, queryFn: fetchTrips });
}

export function useCreateTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTrip,
    onSuccess: (row) => {
      qc.setQueryData(tripKeys.all, (old) => [row, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateTrip(id, patch),
    onSuccess: (row) => {
      qc.setQueryData(tripKeys.all, (old) => (old ?? []).map((t) => (t.id === row.id ? row : t)));
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useDeleteTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: (_, id) => {
      qc.setQueryData(tripKeys.all, (old) => (old ?? []).filter((t) => t.id !== id));
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
