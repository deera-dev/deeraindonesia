import {
  useCreateJahitCardsForBatchMutation,
  useDoneJahitCardsQuery,
  useJahitCardsQuery,
  useKaryawanJahitQuery,
  useLookupJahitCardMutation,
  useMarkCardDoneMutation,
  useReceiveCardMutation,
  useSetTukangPotongForBatchMutation,
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

export function useReceiveCard() {
  const { mutateAsync, isPending } = useReceiveCardMutation();
  return { receive: (params) => mutateAsync(params), receiving: isPending };
}

export function useLookupJahitCard() {
  const { mutateAsync, isPending } = useLookupJahitCardMutation();
  return { lookup: mutateAsync, looking: isPending };
}

export function useUnassignCard() {
  const { mutateAsync } = useUnassignCardMutation();
  return (params) => mutateAsync(params);
}

export function useSetTukangPotongForBatch() {
  const { mutateAsync, isPending } = useSetTukangPotongForBatchMutation();
  return { setTukangPotong: (params) => mutateAsync(params), setting: isPending };
}
