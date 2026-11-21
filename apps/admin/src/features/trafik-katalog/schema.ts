export interface DateRange {
  start: string;
  end: string;
}

export interface VisitStats {
  start: string;
  end: string;
  views: number;
  visitors: number;
  sessions: number;
  internal: { views: number; visitors: number; sessions: number };
  by_channel: Array<{ channel: string; sessions: number; visitors: number }>;
  by_source: Array<{ source: string; channel: string; sessions: number }>;
  by_location: Array<{ city: string; region: string; country: string; sessions: number }>;
  daily: Array<{ date: string; sessions: number; views: number }>;
  top_products: Array<{ kode: string; views: number; qr: number; google: number; ai: number }>;
}
