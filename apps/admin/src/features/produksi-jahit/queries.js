import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createJahitCardsForBatch,
  fetchDoneJahitCards,
  fetchJahitCardById,
  fetchJahitCards,
  fetchKaryawanJahit,
  markCardDone,
  receiveCard,
  setTukangPotongForBatch,
  unassignCard,
} from "./api";

export const jahitCardsKeys = { all: ["jahit-cards"] };
export const karyawanJahitKeys = { all: ["karyawan-jahit"] };
export const doneJahitCardsKeys = {
  filtered: (filter) => ["jahit-cards-done", filter],
};

export function useJahitCardsQuery() {
  return useQuery({ queryKey: jahitCardsKeys.all, queryFn: fetchJahitCards });
}

export function useDoneJahitCardsQuery(filter, enabled) {
  return useQuery({
    queryKey: doneJahitCardsKeys.filtered(filter),
    queryFn: () => fetchDoneJahitCards(filter),
    enabled,
  });
}

export function useKaryawanJahitQuery() {
  return useQuery({ queryKey: karyawanJahitKeys.all, queryFn: fetchKaryawanJahit });
}

export function useCreateJahitCardsForBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJahitCardsForBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useReceiveCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receiveCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useLookupJahitCardMutation() {
  return useMutation({ mutationFn: fetchJahitCardById });
}

export function useSetTukangPotongForBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setTukangPotongForBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useUnassignCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unassignCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
    },
  });
}

export function useMarkCardDoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markCardDone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jahitCardsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["jahit-cards-done"] });
    },
  });
}
