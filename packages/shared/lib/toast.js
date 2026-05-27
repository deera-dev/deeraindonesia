/**
 * toast.js — module-level singleton untuk notifikasi toast.
 * Tidak butuh Provider/Context — panggil dari mana saja.
 *
 * Usage:
 *   import { toast } from "@deera/shared/lib/toast";
 *   toast.success("Data berhasil disimpan");
 *   toast.error("Gagal simpan: " + err.message);
 *   toast.warn("Stok hampir habis");
 */

const listeners = new Set();
let _id = 0;

function emit(type, msg) {
  const id = ++_id;
  listeners.forEach((fn) => fn({ id, type, msg }));
}

export const toast = {
  success: (msg) => emit("success", msg),
  error: (msg) => emit("error", msg),
  warn: (msg) => emit("warn", msg),
};

/** Internal — dipakai oleh ToastContainer */
export function _toastSubscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
