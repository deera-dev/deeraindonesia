import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyNotifications, markNotificationsSeen } from "./api";

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
