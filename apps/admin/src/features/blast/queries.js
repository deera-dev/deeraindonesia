/**
 * features/blast/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCampaigns,
  fetchTargetCountsByCampaign,
  fetchCampaignDetail,
  createCampaign,
  markTargetStatus,
  markCampaignSelesai,
  deleteCampaign,
} from "./api";
import { calcProgress } from "./utils";

export const blastKeys = {
  campaigns: ["blast", "campaigns"],
  targetCounts: ["blast", "target-counts"],
  detail: (id) => ["blast", "campaign", id],
};

export function useCampaignsQuery() {
  return useQuery({ queryKey: blastKeys.campaigns, queryFn: fetchCampaigns });
}

export function useTargetCountsQuery() {
  return useQuery({ queryKey: blastKeys.targetCounts, queryFn: fetchTargetCountsByCampaign });
}

export function useCampaignDetailQuery(campaignId) {
  return useQuery({
    queryKey: blastKeys.detail(campaignId),
    queryFn: () => fetchCampaignDetail(campaignId),
    enabled: !!campaignId,
  });
}

export function useCreateCampaignMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blastKeys.campaigns });
      qc.invalidateQueries({ queryKey: blastKeys.targetCounts });
    },
  });
}

/**
 * useMarkTargetMutation — update status satu target (terkirim/dilewati/
 * pending lagi), lalu cek apakah SELURUH target campaign ini sudah
 * non-pending — kalau iya, auto-tandai campaign "selesai" (markCampaignSelesai).
 * Invalidate query detail campaign + daftar campaign + target counts supaya
 * progress di BlastPage ikut update tanpa refresh manual.
 */
export function useMarkTargetMutation(campaignId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetId, status }) => markTargetStatus(targetId, status),
    onSuccess: async () => {
      const detail = await qc.fetchQuery({
        queryKey: blastKeys.detail(campaignId),
        queryFn: () => fetchCampaignDetail(campaignId),
      });
      const progress = calcProgress(detail.targets);
      if (progress.selesai && detail.campaign.status !== "selesai") {
        await markCampaignSelesai(campaignId);
      }
      qc.invalidateQueries({ queryKey: blastKeys.detail(campaignId) });
      qc.invalidateQueries({ queryKey: blastKeys.campaigns });
      qc.invalidateQueries({ queryKey: blastKeys.targetCounts });
    },
  });
}

export function useDeleteCampaignMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blastKeys.campaigns });
      qc.invalidateQueries({ queryKey: blastKeys.targetCounts });
    },
  });
}
