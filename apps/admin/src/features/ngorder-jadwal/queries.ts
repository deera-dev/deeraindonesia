import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTrip,
  deleteTrip,
  fetchTripOpens,
  fetchTrips,
  toggleTripTokoVisited,
  updateTrip,
} from "./api";
import type { Trip, TripToko, UpdateTripPatch } from "./schema";

export const tripKeys = {
  all: ["ngorder-jadwal", "trips"],
  opens: (tripId: string | null | undefined) => ["ngorder-jadwal", "opens", tripId],
};

export function useTripsQuery() {
  return useQuery({ queryKey: tripKeys.all, queryFn: fetchTrips });
}

export function useTripOpensQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripKeys.opens(tripId),
    queryFn: () => fetchTripOpens(tripId),
    enabled: !!tripId,
    staleTime: 30_000,
  });
}

export function useCreateTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTrip,
    onSuccess: (row: Trip) => {
      qc.setQueryData<Trip[]>(tripKeys.all, (old) => [row, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTripPatch }) => updateTrip(id, patch),
    onSuccess: (row: Trip) => {
      qc.setQueryData<Trip[]>(tripKeys.all, (old) =>
        (old ?? []).map((t) => (t.id === row.id ? row : t)),
      );
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useToggleTripTokoVisitedMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, toko, tokoId }: { tripId: string; toko: TripToko[]; tokoId: string }) =>
      toggleTripTokoVisited(tripId, toko, tokoId),
    onSuccess: (row: Trip) => {
      qc.setQueryData<Trip[]>(tripKeys.all, (old) =>
        (old ?? []).map((t) => (t.id === row.id ? row : t)),
      );
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useDeleteTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: (_: void, id: string) => {
      qc.setQueryData<Trip[]>(tripKeys.all, (old) => (old ?? []).filter((t) => t.id !== id));
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
