export interface HistoryEntry {
  id: string;
  action: string;
  category: string;
  kode: string | null;
  nama: string | null;
  snapshot: Record<string, unknown> | null;
  before_snapshot: Record<string, unknown> | null;
  user_email: string | null;
  user_name: string | null;
  changed_at: string;
}

export interface LogHistoryInput {
  action: string;
  category?: string;
  kode?: string | null;
  nama?: string | null;
  snapshot?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;
}

export interface HistoryFilter {
  dateFrom?: string | null;
  dateTo?: string | null;
  category?: string;
}
