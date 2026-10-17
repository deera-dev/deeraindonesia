import { useMapQuotaStore, MAP_QUOTA_LIMITS } from "./store";

export { useMapQuotaStore, MAP_QUOTA_LIMITS };

export const mapQuota = {
  tryConsume: (kind, amount = 1) => useMapQuotaStore.getState().tryConsume(kind, amount),
  remaining: (kind) => useMapQuotaStore.getState().remaining(kind),
  limit: (kind) => MAP_QUOTA_LIMITS[kind] ?? Infinity,
};
