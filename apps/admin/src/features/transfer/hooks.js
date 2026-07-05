/**
 * features/transfer/hooks.js — PUBLIC SURFACE fitur transfer (admin-local).
 * Komponen HANYA boleh import dari sini (atau ./index.js).
 *
 * Fitur ini TIDAK punya api.js/queries.js sendiri — seluruh data transfer
 * (CRUD, approve/reject, daftar, badge count pending) sudah disediakan oleh
 * fitur shared `transfers` (@deera/shared/features/transfers/hooks) dan
 * `stok` (@deera/shared/features/stok/hooks). Komponen di sini mengimpor
 * hooks shared tersebut langsung — itu sudah Dependency Inversion yang
 * benar (UI bergantung pada hooks.js publik fitur lain, bukan pada
 * supabase/api.js-nya).
 *
 * File ini hanya membungkus draft form "buat transfer baru" (Zustand,
 * lihat ./store.js) supaya komponen tidak pernah menyentuh localStorage
 * atau store mentah secara langsung.
 */
import { useTransferDraftStore } from "./store";

// Snapshot draft tersimpan — dibaca SEKALI saat TransferForm mount (mode
// buat baru) untuk pre-fill state form. Sengaja bukan hook reaktif.
export function readTransferDraft() {
  return useTransferDraftStore.getState();
}

export function useTransferDraftActions() {
  const save = useTransferDraftStore((s) => s.save);
  const clear = useTransferDraftStore((s) => s.clear);
  return { saveDraft: save, clearDraft: clear };
}
