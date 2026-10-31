import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTrip, deleteTrip, fetchTripOpens, fetchTrips, updateTrip } from "./api";

export const tripKeys = {
  all: ["ngorder-jadwal", "trips"],
  opens: (tripId) => ["ngorder-jadwal", "opens", tripId],
};

export function useTripsQuery() {
  return useQuery({ queryKey: tripKeys.all, queryFn: fetchTrips });
}

export function useTripOpensQuery(tripId) {
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
