import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sampelKeys } from "../ngorder/queries";
import {
  createCampaign,
  createMessageTemplate,
  deleteCampaign,
  deleteMessageTemplate,
  fetchCampaignDetail,
  fetchCampaigns,
  fetchMessageTemplates,
  fetchTargetCountsByCampaign,
  markCampaignSelesai,
  markTargetStatus,
  updateMessageTemplate,
} from "./api";
import { calcProgress } from "./utils";

export const blastKeys = {
  campaigns: ["blast", "campaigns"],
  targetCounts: ["blast", "target-counts"],
  detail: (id) => ["blast", "campaign", id],
  templates: ["blast", "templates"],
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
      qc.invalidateQueries({ queryKey: sampelKeys.tokoList });
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

export function useMessageTemplatesQuery() {
  return useQuery({ queryKey: blastKeys.templates, queryFn: fetchMessageTemplates });
}

export function useCreateMessageTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMessageTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: blastKeys.templates }),
  });
}

export function useUpdateMessageTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateMessageTemplate(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: blastKeys.templates }),
  });
}

export function useDeleteMessageTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMessageTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: blastKeys.templates }),
  });
}
