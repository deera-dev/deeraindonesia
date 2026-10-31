import {
  useMarkNotificationReadMutation,
  useMarkNotificationsSeenMutation,
  useNotificationsQuery,
} from "./queries";

export function useNotifications() {
  const { data, isLoading, error } = useNotificationsQuery();
  const notifications = data ?? [];
  return {
    notifications,
    unreadCount: notifications.filter((n) => n.is_unread).length,
    loading: isLoading,
    error: error ?? null,
  };
}

export function useMarkNotificationsSeen() {
  const m = useMarkNotificationsSeenMutation();
  return { markSeen: () => m.mutate(), marking: m.isPending };
}

export function useMarkNotificationRead() {
  const m = useMarkNotificationReadMutation();
  return (id) => m.mutate(id);
}
