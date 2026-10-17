import {
  useAssignKaryawanMutation,
  useCreateJahitCardsForBatchMutation,
  useDoneJahitCardsQuery,
  useJahitCardsQuery,
  useKaryawanJahitQuery,
  useMarkCardDoneMutation,
  useMoveBackToProgressMutation,
  useMoveToReadyFinishingMutation,
  useUnassignCardMutation,
} from "./queries";

export function useJahitCards() {
  const { data, isLoading } = useJahitCardsQuery();
  return { cards: data ?? [], loading: isLoading };
}

export function useDoneJahitCards(filter, enabled) {
  const { data, isLoading } = useDoneJahitCardsQuery(filter, enabled);
  return { cards: data ?? [], loading: isLoading };
}

export function useMarkCardDone() {
  const { mutateAsync } = useMarkCardDoneMutation();
  return (params) => mutateAsync(params);
}

export function useKaryawanJahit() {
  const { data, isLoading } = useKaryawanJahitQuery();
  return { karyawanList: data ?? [], loading: isLoading };
}

export function useCreateJahitCardsForBatch() {
  const { mutateAsync } = useCreateJahitCardsForBatchMutation();
  return (params) => mutateAsync(params);
}

export function useAssignKaryawan() {
  const { mutateAsync, isPending } = useAssignKaryawanMutation();
  return { assign: (params) => mutateAsync(params), assigning: isPending };
}

export function useMoveToReadyFinishing() {
  const { mutateAsync } = useMoveToReadyFinishingMutation();
  return (params) => mutateAsync(params);
}

export function useUnassignCard() {
  const { mutateAsync } = useUnassignCardMutation();
  return (params) => mutateAsync(params);
}

export function useMoveBackToProgress() {
  const { mutateAsync } = useMoveBackToProgressMutation();
  return (params) => mutateAsync(params);
}
