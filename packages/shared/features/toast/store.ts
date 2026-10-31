import { create } from "zustand";

export type ToastType = "success" | "error" | "warn";

export interface Toast {
  id: number;
  type: ToastType;
  msg: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, msg: string) => number;
  remove: (id: number) => void;
}

const DURATIONS: Record<ToastType, number> = { success: 4000, error: 6000, warn: 5000 };
let _id = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, msg) => {
    const id = ++_id;
    set((s) => ({ toasts: [...s.toasts, { id, type, msg }] }));
    setTimeout(() => get().remove(id), DURATIONS[type] ?? 4000);
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
