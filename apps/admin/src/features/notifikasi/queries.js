import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyNotifications, markNotificationsSeen, markNotificationRead } from "./api";

export const notifKeys = { all: ["notifikasi"] };

export function useNotificationsQuery() {
  return useQuery({
    queryKey: notifKeys.all,
    queryFn: () => fetchMyNotifications(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsSeenMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsSeen,
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notifKeys.all });
      const prev = qc.getQueryData(notifKeys.all);
      qc.setQueryData(notifKeys.all, (old) => (old ?? []).map((n) => (n.id === id ? { ...n, is_unread: false } : n)));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notifKeys.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}
