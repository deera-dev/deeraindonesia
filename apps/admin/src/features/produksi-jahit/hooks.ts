import {
  useDoneJahitCardsQuery,
  useJahitCardsQuery,
  useKaryawanJahitQuery,
  useLookupJahitCardMutation,
  useMarkCardDoneMutation,
  useMarkCardsDoneMutation,
  useReceiveCardMutation,
  useSetTukangPotongForBatchMutation,
  useUnassignCardMutation,
} from "./queries";
import type { DoneJahitCardsFilter } from "./schema";

export function useJahitCards() {
  const { data, isLoading } = useJahitCardsQuery();
  return { cards: data ?? [], loading: isLoading };
}

export function useDoneJahitCards(filter: DoneJahitCardsFilter, enabled: boolean) {
  const { data, isLoading } = useDoneJahitCardsQuery(filter, enabled);
  return { cards: data ?? [], loading: isLoading };
}

export function useMarkCardDone() {
  const { mutateAsync } = useMarkCardDoneMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useKaryawanJahit() {
  const { data, isLoading } = useKaryawanJahitQuery();
  return { karyawanList: data ?? [], loading: isLoading };
}

export function useReceiveCard() {
  const { mutateAsync, isPending } = useReceiveCardMutation();
  return {
    receive: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    receiving: isPending,
  };
}

export function useLookupJahitCard() {
  const { mutateAsync, isPending } = useLookupJahitCardMutation();
  return { lookup: mutateAsync, looking: isPending };
}

export function useUnassignCard() {
  const { mutateAsync } = useUnassignCardMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useSetTukangPotongForBatch() {
  const { mutateAsync, isPending } = useSetTukangPotongForBatchMutation();
  return {
    setTukangPotong: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    setting: isPending,
  };
}

export function useMarkCardsDone() {
  const { mutateAsync, isPending } = useMarkCardsDoneMutation();
  return {
    markCardsDone: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    marking: isPending,
  };
}
