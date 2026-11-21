export interface NotificationRow {
  id: string;
  created_at: string;
  type: string;
  section: string;
  title: string;
  body: string;
  url: string;
  is_unread: boolean;
}
