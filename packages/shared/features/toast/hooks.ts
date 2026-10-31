import { useToastStore } from "./store";

export { useToastStore };

export const toast = {
  success: (msg: string) => useToastStore.getState().push("success", msg),
  error: (msg: string) => useToastStore.getState().push("error", msg),
  warn: (msg: string) => useToastStore.getState().push("warn", msg),
};
