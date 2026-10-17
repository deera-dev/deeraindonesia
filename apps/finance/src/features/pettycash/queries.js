import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePettycash, fetchPettycashAll, savePettycash } from "./api";

export const pettycashKeys = {
  all: ["pettycash", "all"],
};

export function usePettycashAllQuery() {
  return useQuery({
    queryKey: pettycashKeys.all,
    queryFn: fetchPettycashAll,
  });
}

function invalidatePettycash(queryClient) {
  queryClient.invalidateQueries({ queryKey: pettycashKeys.all });
}

export function useSavePettycashMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, editing }) => savePettycash({ payload, editing }),
    onSuccess: () => invalidatePettycash(queryClient),
  });
}

export function useDeletePettycashMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deletePettycash(id),
    onSuccess: () => invalidatePettycash(queryClient),
  });
}
