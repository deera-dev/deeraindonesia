export interface BlastCampaign {
  id: string;
  nama: string;
  product_kodes: string[];
  message: string;
  status: string;
  created_at: string;
}

export type BlastTargetStatus = "terkirim" | "dilewati" | "pending";

export interface BlastTarget {
  id: string;
  campaign_id: string;
  nama: string;
  no_hp: string;
  status: BlastTargetStatus;
  sent_at?: string | null;
  source?: string | null;
  contact_id?: string | null;
}

export interface TargetCounts {
  total: number;
  terkirim: number;
  dilewati: number;
  pending: number;
}

export interface CampaignDetail {
  campaign: BlastCampaign;
  targets: BlastTarget[];
}

export interface CreateCampaignInput {
  nama: string;
  productKodes?: string[];
  message?: string;
  targets: Array<{ nama: string; no_hp: string; source?: string; contact_id?: string }>;
}

export interface MessageTemplate {
  id: string;
  nama: string;
  pesan: string;
  created_at: string;
  updated_at: string;
}
