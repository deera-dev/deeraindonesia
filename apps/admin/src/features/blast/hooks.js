/**
 * features/blast/hooks.js — Public surface fitur Blast (Dependency
 * Inversion, CLAUDE.md §7). Komponen TIDAK PERNAH import api.js/queries.js
 * langsung — selalu lewat sini / index.js.
 */
export {
  useCampaignsQuery,
  useTargetCountsQuery,
  useCampaignDetailQuery,
  useCreateCampaignMutation,
  useMarkTargetMutation,
  useDeleteCampaignMutation,
  useMessageTemplatesQuery,
  useCreateMessageTemplateMutation,
  useUpdateMessageTemplateMutation,
  useDeleteMessageTemplateMutation,
} from "./queries";
export { composeBlastMessage, buildWaLink, calcProgress, normalizePhone } from "./utils";
