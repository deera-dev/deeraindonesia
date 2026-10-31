import { MAP_QUOTA_LIMITS, useMapQuotaStore } from "./store";

export { MAP_QUOTA_LIMITS, useMapQuotaStore };

export const mapQuota = {
  tryConsume: (kind, amount = 1) => useMapQuotaStore.getState().tryConsume(kind, amount),
  remaining: (kind) => useMapQuotaStore.getState().remaining(kind),
  limit: (kind) => MAP_QUOTA_LIMITS[kind] ?? Infinity,
};
