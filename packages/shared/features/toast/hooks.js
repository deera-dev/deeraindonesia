import { useToastStore } from "./store";

export { useToastStore };

export const toast = {
  success: (msg) => useToastStore.getState().push("success", msg),
  error: (msg) => useToastStore.getState().push("error", msg),
  warn: (msg) => useToastStore.getState().push("warn", msg),
};
