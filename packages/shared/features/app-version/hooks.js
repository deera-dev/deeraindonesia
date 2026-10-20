import { useLatestVersionQuery } from "./queries";

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

export function useUpdateAvailable() {
  const { data: latestVersion } = useLatestVersionQuery();
  const isUpdateAvailable = Boolean(latestVersion) && latestVersion !== CURRENT_VERSION;
  return { isUpdateAvailable, latestVersion, currentVersion: CURRENT_VERSION };
}
