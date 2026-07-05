/**
 * features/toast/store.js
 * Zustand store untuk notifikasi toast. Menggantikan pub-sub singleton manual
 * yang lama (lib/toast.js) — auto-dismiss timer dipindah ke dalam action push()
 * supaya komponen (ToastContainer) tidak perlu melacak timeout sendiri.
 */
import { create } from "zustand";

const DURATIONS = { success: 4000, error: 6000, warn: 5000 };
let _id = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (type, msg) => {
    const id = ++_id;
    set((s) => ({ toasts: [...s.toasts, { id, type, msg }] }));
    setTimeout(() => get().remove(id), DURATIONS[type] ?? 4000);
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
