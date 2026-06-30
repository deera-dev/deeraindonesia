/**
 * features/toast/hooks.js
 * PUBLIC SURFACE fitur toast — komponen import dari sini, bukan store.js langsung.
 *
 * `toast` adalah singleton non-hook (bukan React hook) — dipanggil dari mana saja
 * (event handler, fungsi async di luar komponen, dst), pola call-site SAMA seperti
 * lib/toast.js lama:
 *   import { toast } from "@deera/shared/features/toast/hooks";
 *   toast.success("Data berhasil disimpan");
 *
 * Ini bukan pelanggaran Dependency Inversion — toast TETAP diekspos lewat
 * hooks.js (abstraksi), implementasinya (Zustand getState()) tersembunyi di sini.
 */
import { useToastStore } from "./store";

export { useToastStore };

export const toast = {
  success: (msg) => useToastStore.getState().push("success", msg),
  error: (msg) => useToastStore.getState().push("error", msg),
  warn: (msg) => useToastStore.getState().push("warn", msg),
};
